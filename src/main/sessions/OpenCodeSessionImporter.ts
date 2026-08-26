import { app } from "electron";
import { existsSync } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
	OpenCodeImportReport,
	OpenCodeImportResult,
	OpenCodeImportStatus,
	OpenCodeSessionSummary,
} from "../../shared/types";
import {
	cleanSessionTitle,
	extractPiText,
	makeEntryId,
	normalizeSessionPath,
	projectSessionDir,
	readImportMeta,
	sha1Hash,
	stringifyToolOutput,
} from "./importerShared";

type OpenCodeMessage = {
	id: string;
	time_created: number;
	time_updated: number;
	data: Record<string, any>;
	parts: OpenCodePart[];
};

type OpenCodePart = {
	id: string;
	message_id: string;
	time_created: number;
	time_updated: number;
	data: Record<string, any>;
};

type ParsedOpenCodeSession = {
	meta: Record<string, any>;
	messages: OpenCodeMessage[];
	sourcePath: string;
	/** OpenCode 所有历史在同一个 DB 中，列表里展示单会话内容估算大小，而不是整个数据库大小。 */
	sourceSize: number;
	sourceMtime: number;
};

/** OpenCode 导入器写入的标记类型，用于回读判断源文件是否更新 */
function readOpenCodeImportMeta(targetPath: string) {
	return readImportMeta(targetPath, "opencode_import");
}

export class OpenCodeSessionImporter {
	private readonly openCodeDb = join(app.getPath("home"), ".local", "share", "opencode", "opencode.db");
	private readonly piRoot = join(app.getPath("home"), ".pi", "agent", "sessions");

	async scan(projectPath: string): Promise<OpenCodeSessionSummary[]> {
		if (!existsSync(this.openCodeDb)) return [];
		const sessions = await this.readOpenCodeSessions(projectPath);
		const summaries = await Promise.all(sessions.map((session) => this.toSummary(session, projectPath)));
		return summaries.sort((a, b) => b.updatedAt - a.updatedAt);
	}

	async import(projectPath: string, sourcePaths: string[]): Promise<OpenCodeImportReport> {
		const sessions = await this.readOpenCodeSessions(projectPath);
		const bySourcePath = new Map(sessions.map((session) => [session.sourcePath, session]));
		const results: OpenCodeImportResult[] = [];
		for (const sourcePath of sourcePaths) {
			results.push(await this.importOne(projectPath, sourcePath, bySourcePath.get(sourcePath)));
		}
		return {
			results,
			imported: results.filter((result) => result.success).length,
			failed: results.filter((result) => !result.success).length,
		};
	}

	private async importOne(projectPath: string, sourcePath: string, parsed?: ParsedOpenCodeSession): Promise<OpenCodeImportResult> {
		try {
			if (!parsed) throw new Error("OpenCode session not found in database");
			const targetPath = this.getTargetPath(projectPath, parsed);
			const existing = await readOpenCodeImportMeta(targetPath);
			const converted = this.convertToPiSession(projectPath, parsed);
			await mkdir(projectSessionDir(this.piRoot, projectPath), { recursive: true });
			// OpenCode 历史集中存放在 SQLite 中；导入时只生成 pi 可读副本，不修改原始数据库。
			await writeFile(targetPath, converted.raw, "utf8");
			return {
				id: String(parsed.meta.id),
				sourcePath,
				targetPath,
				title: converted.title,
				success: true,
				overwritten: Boolean(existing),
				messageCount: converted.messageCount,
			};
		} catch (error) {
			return {
				id: sourcePath,
				sourcePath,
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	private async toSummary(session: ParsedOpenCodeSession, projectPath: string): Promise<OpenCodeSessionSummary> {
		const targetPath = this.getTargetPath(projectPath, session);
		const importMeta = await readOpenCodeImportMeta(targetPath);
		const converted = this.convertToPiSession(projectPath, session);
		const status: OpenCodeImportStatus = !importMeta
			? "new"
			: importMeta.sourceMtime === session.sourceMtime && importMeta.sourceSize === session.sourceSize
				? "current"
				: "outdated";

		return {
			id: String(session.meta.id),
			sourcePath: session.sourcePath,
			targetPath,
			cwd: String(session.meta.directory ?? projectPath),
			title: converted.title,
			preview: converted.preview,
			createdAt: Number(session.meta.time_created ?? session.sourceMtime),
			updatedAt: Number(session.meta.time_updated ?? session.sourceMtime),
			messageCount: converted.messageCount,
			status,
			sourceSize: session.sourceSize,
			importedSourceMtime: importMeta?.sourceMtime,
		};
	}

	private convertToPiSession(projectPath: string, session: ParsedOpenCodeSession) {
		const sessionId = String(session.meta.id);
		const timestamp = new Date(Number(session.meta.time_created ?? session.sourceMtime)).toISOString();
		const model = this.parseModel(session.meta.model);
		const titleState = { title: "", preview: "" };
		const lines: string[] = [];
		let parentId: string | null = null;
		let sequence = 0;
		let messageCount = 0;

		const pushEntry = (entry: Record<string, unknown>) => lines.push(JSON.stringify(entry));
		const pushMessage = (role: "user" | "assistant" | "toolResult", content: unknown[], extra: Record<string, unknown> = {}, timestampValue?: number) => {
			if (content.length === 0) return;
			const id = makeEntryId(sessionId, sequence++);
			const messageTimestamp = Number(timestampValue ?? session.sourceMtime + sequence);
			pushEntry({
				type: "message",
				id,
				parentId,
				timestamp: new Date(messageTimestamp).toISOString(),
				message: {
					role,
					content,
					timestamp: messageTimestamp,
					...(role === "assistant" ? { usage: this.toUsage(extra.tokens) } : {}),
					...extra,
				},
			});
			parentId = id;
			messageCount += 1;

			const text = extractPiText(content).trim();
			if (text && !titleState.preview) titleState.preview = text.slice(0, 160);
			if (role === "user" && text && !titleState.title) titleState.title = cleanSessionTitle(text);
		};

		pushEntry({ type: "session", version: 3, id: sessionId, timestamp, cwd: projectPath });
		pushEntry({
			type: "opencode_import",
			version: 1,
			openCodeSessionId: sessionId,
			sourcePath: session.sourcePath,
			sourceMtime: session.sourceMtime,
			sourceSize: session.sourceSize,
			importedAt: new Date().toISOString(),
		});
		const modelChangeId = makeEntryId(sessionId, sequence++);
		pushEntry({
			type: "model_change",
			id: modelChangeId,
			parentId,
			timestamp,
			provider: model.providerID || "opencode",
			modelId: model.id || model.modelID || "opencode",
		});
		parentId = modelChangeId;

		for (const message of session.messages) {
			const messageData = message.data;
			const role = messageData.role;
			const content: any[] = [];
			for (const part of message.parts) {
				const partData = part.data;
				if (partData.type === "text" && partData.text) {
					content.push({ type: "text", text: String(partData.text) });
				} else if (partData.type === "reasoning" && partData.text) {
					content.push({ type: "thinking", thinking: String(partData.text), thinkingSignature: "opencode_reasoning" });
				} else if (partData.type === "tool") {
					const toolCallId = String(partData.callID ?? part.id);
					if (role === "assistant") {
						content.push({ type: "toolCall", id: toolCallId, name: String(partData.tool ?? "tool"), arguments: partData.state?.input ?? {} });
					} else {
						pushMessage("toolResult", [{ type: "text", text: this.extractToolOutput(partData) }], {
							toolCallId,
							toolName: String(partData.tool ?? "tool"),
							isError: partData.state?.status === "error",
						}, part.time_created);
					}
				}
			}

			if (role === "user") {
				pushMessage("user", content, {}, message.time_created);
			} else if (role === "assistant") {
				pushMessage("assistant", content, {
					api: "opencode-import",
					provider: messageData.providerID ?? model.providerID ?? "opencode",
					model: messageData.modelID ?? model.id ?? model.modelID ?? "opencode",
					stopReason: messageData.finish ?? "stop",
					tokens: messageData.tokens,
				}, message.time_created);
			}
		}

		const title = cleanSessionTitle(String(session.meta.title ?? "")) || titleState.title || cleanSessionTitle(basename(session.sourcePath)) || "OpenCode 会话";
		lines.splice(1, 0, JSON.stringify({ sessionName: title, cwd: projectPath }));
		return {
			raw: `${lines.join("\n")}\n`,
			title,
			preview: titleState.preview || "OpenCode imported session",
			messageCount,
		};
	}

	private async readOpenCodeSessions(projectPath: string): Promise<ParsedOpenCodeSession[]> {
		const info = await stat(this.openCodeDb);
		const normalizedProject = normalizeSessionPath(projectPath);
		const db = new DatabaseSync(this.openCodeDb, { readOnly: true });
		try {
			const sessions = db.prepare(`
				select s.*, p.worktree
				from session s
				join project p on p.id = s.project_id
				where lower(replace(p.worktree, '\\', '/')) = lower(?)
				   or lower(replace(s.directory, '\\', '/')) = lower(?)
				   or lower(replace(s.directory, '\\', '/')) like lower(? || '/%')
				order by s.time_updated desc
			`).all(normalizedProject, normalizedProject, normalizedProject) as Array<Record<string, any>>;

			return sessions.map((session) => {
				const messages = db.prepare("select id, time_created, time_updated, data from message where session_id = ? order by time_created asc").all(session.id) as Array<Record<string, any>>;
				const parts = db.prepare("select id, message_id, session_id, time_created, time_updated, data from part where session_id = ? order by time_created asc").all(session.id) as Array<Record<string, any>>;
				const partsByMessage = new Map<string, OpenCodePart[]>();
				for (const part of parts) {
					const parsedPart = { ...part, data: this.parseJson(part.data) } as OpenCodePart;
					const current = partsByMessage.get(parsedPart.message_id) ?? [];
					current.push(parsedPart);
					partsByMessage.set(parsedPart.message_id, current);
				}
				const parsedMessages = messages.map((message) => ({
					id: String(message.id),
					time_created: Number(message.time_created),
					time_updated: Number(message.time_updated),
					data: this.parseJson(message.data),
					parts: partsByMessage.get(String(message.id)) ?? [],
				}));
				return {
					meta: session,
					messages: parsedMessages,
					sourcePath: `${this.openCodeDb}#${session.id}`,
					sourceSize: this.estimateSessionSize(session, parsedMessages),
					sourceMtime: info.mtimeMs,
				};
			});
		} finally {
			db.close();
		}
	}

	private parseJson(value: unknown) {
		if (typeof value !== "string") return value && typeof value === "object" ? value as Record<string, any> : {};
		try {
			return JSON.parse(value);
		} catch {
			return {};
		}
	}

	private estimateSessionSize(meta: Record<string, any>, messages: OpenCodeMessage[]) {
		return Buffer.byteLength(
			JSON.stringify({
				meta,
				messages,
			}),
			"utf8",
		);
	}

	private parseModel(value: unknown) {
		if (typeof value === "string") return this.parseJson(value);
		return value && typeof value === "object" ? value as Record<string, any> : {};
	}

	private toUsage(tokens: any) {
		return {
			input: Number(tokens?.input ?? 0),
			output: Number(tokens?.output ?? 0),
			cacheRead: Number(tokens?.cache?.read ?? 0),
			cacheWrite: Number(tokens?.cache?.write ?? 0),
			totalTokens: Number(tokens?.total ?? 0),
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
		};
	}


	private getTargetPath(projectPath: string, session: ParsedOpenCodeSession) {
		const id = String(session.meta.id ?? sha1Hash(session.sourcePath)).replace(/[^a-zA-Z0-9_-]/g, "-");
		return join(projectSessionDir(this.piRoot, projectPath), `opencode_${id}.jsonl`);
	}



	private extractToolOutput(part: Record<string, any>) {
		const state = part.state ?? {};
		const output = state.output ?? state.error ?? part.output ?? "";
		return stringifyToolOutput(output);
	}





}

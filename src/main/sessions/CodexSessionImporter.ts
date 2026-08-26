import { app } from "electron";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type {
	CodexImportReport,
	CodexImportResult,
	CodexImportStatus,
	CodexSessionSummary,
} from "../../shared/types";
import { getCodexSessionThreadInfo } from "../../shared/codexSessionMeta";
import {
	cleanSessionTitle,
	collectJsonlFiles,
	extractPiText,
	makeEntryId,
	normalizeSessionPath,
	projectSessionDir,
	readImportMeta,
	sha1Hash,
	stringifyToolOutput,
	zeroUsage,
} from "./importerShared";

type ParsedCodexSession = {
	meta: Record<string, any>;
	entries: Array<Record<string, any>>;
	sourcePath: string;
	sourceSize: number;
	sourceMtime: number;
};

/** Codex 导入器写入的标记类型，用于回读判断源文件是否更新 */
function readCodexImportMeta(targetPath: string) {
	return readImportMeta(targetPath, "codex_import");
}

export class CodexSessionImporter {
	private readonly codexRoot = join(app.getPath("home"), ".codex", "sessions");
	private readonly piRoot = join(app.getPath("home"), ".pi", "agent", "sessions");

	async scan(projectPath: string): Promise<CodexSessionSummary[]> {
		const files = await collectJsonlFiles(this.codexRoot).catch(() => []);
		const sessions = await Promise.all(
			files.map((file) => this.readCodexSession(file).catch(() => null)),
		);
		const normalizedProject = normalizeSessionPath(projectPath);

		const summaries = await Promise.all(
			sessions
				.filter((session): session is ParsedCodexSession => Boolean(session))
				.filter((session) => normalizeSessionPath(session.meta.cwd) === normalizedProject)
				.map((session) => this.toSummary(session, projectPath)),
		);

		return summaries.sort((a, b) => b.updatedAt - a.updatedAt);
	}

	async import(projectPath: string, sourcePaths: string[]): Promise<CodexImportReport> {
		const results: CodexImportResult[] = [];
		for (const sourcePath of sourcePaths) {
			results.push(await this.importOne(projectPath, sourcePath));
		}
		return {
			results,
			imported: results.filter((result) => result.success).length,
			failed: results.filter((result) => !result.success).length,
		};
	}

	private async importOne(
		projectPath: string,
		sourcePath: string,
	): Promise<CodexImportResult> {
		try {
			const parsed = await this.readCodexSession(sourcePath);
			const sourceCwd = normalizeSessionPath(parsed.meta.cwd);
			if (sourceCwd !== normalizeSessionPath(projectPath)) {
				throw new Error("Codex session cwd does not match selected project");
			}

			const targetPath = this.getTargetPath(projectPath, parsed);
			const existing = await readCodexImportMeta(targetPath);
			const converted = this.convertToPiSession(projectPath, parsed);
			await mkdir(projectSessionDir(this.piRoot, projectPath), { recursive: true });
			// 目标路径由 Codex session id 决定；重复导入覆盖同一个副本，保留原始 Codex JSONL 不动。
			await writeFile(targetPath, converted.raw, "utf8");

			return {
				id: String(parsed.meta.id ?? sourcePath),
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

	private async toSummary(
		session: ParsedCodexSession,
		projectPath: string,
	): Promise<CodexSessionSummary> {
		const targetPath = this.getTargetPath(projectPath, session);
		const importMeta = await readCodexImportMeta(targetPath);
		const converted = this.convertToPiSession(projectPath, session);
		const status: CodexImportStatus = !importMeta
			? "new"
			: importMeta.sourceMtime === session.sourceMtime &&
				  importMeta.sourceSize === session.sourceSize
				? "current"
				: "outdated";

		const originalTimestamp = Date.parse(String(session.meta.timestamp ?? "")) || session.sourceMtime;
		const threadInfo = getCodexSessionThreadInfo(session.meta);
		return {
			id: String(session.meta.id ?? session.sourcePath),
			sourcePath: session.sourcePath,
			targetPath,
			cwd: String(session.meta.cwd ?? ""),
			title: converted.title,
			preview: converted.preview,
			createdAt: originalTimestamp,
			updatedAt: originalTimestamp,
			messageCount: converted.messageCount,
			status,
			sourceSize: session.sourceSize,
			importedSourceMtime: importMeta?.sourceMtime,
			threadSource: threadInfo.threadSource,
			parentThreadId: threadInfo.parentThreadId,
			agentRole: threadInfo.agentRole,
			agentNickname: threadInfo.agentNickname,
		};
	}

	private convertToPiSession(projectPath: string, session: ParsedCodexSession) {
		const sessionId = String(session.meta.id ?? sha1Hash(session.sourcePath));
		const threadInfo = getCodexSessionThreadInfo(session.meta);
		const timestamp = new Date(
			Date.parse(String(session.meta.timestamp ?? "")) || session.sourceMtime,
		).toISOString();
		const titleState = { title: "", preview: "" };
		const toolNames = new Map<string, string>();
		const toolStartedAt = new Map<string, number>();
		const lines: string[] = [];
		let parentId: string | null = null;
		let sequence = 0;
		let messageCount = 0;
		let pendingThinking = "";

		const pushEntry = (entry: Record<string, unknown>) => {
			lines.push(JSON.stringify(entry));
		};
		const pushMessage = (
			role: "user" | "assistant" | "toolResult",
			content: unknown[],
			extra: Record<string, unknown> = {},
			timestampValue?: unknown,
		) => {
			if (content.length === 0) return;
			const id = makeEntryId(sessionId, sequence++);
			const messageTimestamp =
				this.parseTimestamp(timestampValue) ?? session.sourceMtime + sequence;
			const ts = new Date(messageTimestamp).toISOString();
			pushEntry({
				type: "message",
				id,
				parentId,
				timestamp: ts,
				message: {
					role,
					content,
					timestamp: messageTimestamp,
					// pi 的上下文统计会读取 assistant.usage.totalTokens；Codex 原始历史没有该字段，导入时用 0 值占位保证可继续对话。
					...(role === "assistant" ? { usage: zeroUsage() } : {}),
					...extra,
				},
			});
			parentId = id;
			messageCount += 1;

			const text = extractPiText(content).trim();
			if (text && !titleState.preview) titleState.preview = text.slice(0, 160);
			if (role === "user" && text && !titleState.title) {
				titleState.title = cleanSessionTitle(text);
			}
		};

		pushEntry({
			type: "session",
			version: 3,
			id: sessionId,
			timestamp,
			cwd: projectPath,
		});
		pushEntry({
			type: "codex_import",
			version: 1,
			codexSessionId: sessionId,
			sourcePath: session.sourcePath,
			sourceMtime: session.sourceMtime,
			sourceSize: session.sourceSize,
			importedAt: new Date().toISOString(),
			threadSource: threadInfo.threadSource,
			parentThreadId: threadInfo.parentThreadId,
			agentRole: threadInfo.agentRole,
			agentNickname: threadInfo.agentNickname,
		});
		const modelChangeId = makeEntryId(sessionId, sequence++);
		pushEntry({
			type: "model_change",
			id: modelChangeId,
			parentId,
			timestamp,
			provider: String(session.meta.model_provider ?? "codex"),
			modelId: String(session.meta.model ?? "codex"),
		});
		parentId = modelChangeId;

		for (const entry of session.entries) {
			if (entry.type === "event_msg" && entry.payload?.type === "user_message") {
				const text = String(entry.payload.message ?? "").trim();
				if (text) pushMessage("user", [{ type: "text", text }], {}, entry.timestamp);
				continue;
			}

			if (entry.type !== "response_item") continue;
			const payload = entry.payload ?? {};

			if (payload.type === "reasoning") {
				const reasoning = this.extractCodexText(payload).trim();
				if (reasoning) pendingThinking = this.joinText(pendingThinking, reasoning);
				continue;
			}

			if (payload.type === "message" && payload.role === "assistant") {
				const text = this.extractCodexText(payload).trim();
				const content = [
					...(pendingThinking
						? [{ type: "thinking", thinking: pendingThinking, thinkingSignature: "codex_reasoning" }]
						: []),
					...(text ? [{ type: "text", text }] : []),
				];
				pendingThinking = "";
				pushMessage(
					"assistant",
					content,
					{
						api: "codex-import",
						provider: String(session.meta.model_provider ?? "codex"),
						model: String(session.meta.model ?? "codex"),
						stopReason: "stop",
					},
					entry.timestamp,
				);
				continue;
			}

			if (payload.type === "function_call") {
				const callId = String(payload.call_id ?? payload.id ?? makeEntryId(sessionId, sequence));
				const toolName = String(payload.name ?? "tool");
				toolNames.set(callId, toolName);
				const callStartedAt = this.parseTimestamp(entry.timestamp);
				if (callStartedAt !== undefined) toolStartedAt.set(callId, callStartedAt);
				const args = this.parseArguments(payload.arguments);
				const content = [
					...(pendingThinking
						? [{ type: "thinking", thinking: pendingThinking, thinkingSignature: "codex_reasoning" }]
						: []),
					{ type: "toolCall", id: callId, name: toolName, arguments: args },
				];
				pendingThinking = "";
				pushMessage(
					"assistant",
					content,
					{
						api: "codex-import",
						provider: String(session.meta.model_provider ?? "codex"),
						model: String(session.meta.model ?? "codex"),
						stopReason: "toolUse",
					},
					entry.timestamp,
				);
				continue;
			}

			if (payload.type === "function_call_output") {
				const callId = String(payload.call_id ?? payload.id ?? makeEntryId(sessionId, sequence));
				const output = this.extractToolOutput(payload);
				const completedAt = this.parseTimestamp(entry.timestamp);
				const startedAt = toolStartedAt.get(callId);
				pushMessage(
					"toolResult",
					[{ type: "text", text: output }],
					{
						toolCallId: callId,
						toolName: toolNames.get(callId) ?? "tool",
						isError: Boolean(payload.is_error),
						// Codex 历史只有 function_call / output 时间戳，导入时保存派生耗时，
						// 让桌面端工具卡片与原生 pi 会话保持一致。
						...(startedAt !== undefined ? { startedAt } : {}),
						...(startedAt !== undefined && completedAt !== undefined
							? { durationMs: Math.max(0, completedAt - startedAt) }
							: {}),
					},
					entry.timestamp,
				);
			}
		}

		if (pendingThinking) {
			pushMessage("assistant", [
				{ type: "thinking", thinking: pendingThinking, thinkingSignature: "codex_reasoning" },
			]);
		}

		const title = titleState.title || cleanSessionTitle(basename(session.sourcePath)) || "Codex 会话";
		lines.splice(1, 0, JSON.stringify({ sessionName: title, cwd: projectPath }));

		return {
			raw: `${lines.join("\n")}\n`,
			title,
			preview: titleState.preview || "Codex imported session",
			messageCount,
		};
	}


	private async readCodexSession(filePath: string): Promise<ParsedCodexSession> {
		this.assertCodexSourcePath(filePath);
		const [raw, info] = await Promise.all([readFile(filePath, "utf8"), stat(filePath)]);
		const entries = raw
			.split(/\r?\n/)
			.filter(Boolean)
			.map((line) => JSON.parse(line) as Record<string, any>);
		const meta = entries.find((entry) => entry.type === "session_meta")?.payload;
		if (!meta?.id || !meta?.cwd) throw new Error("Missing Codex session metadata");
		return {
			meta,
			entries,
			sourcePath: filePath,
			sourceSize: info.size,
			sourceMtime: info.mtimeMs,
		};
	}

	private assertCodexSourcePath(filePath: string) {
		const root = normalizeSessionPath(this.codexRoot);
		const target = normalizeSessionPath(filePath);
		if (target !== root && !target.startsWith(`${root}/`)) {
			throw new Error("Codex session path is outside ~/.codex/sessions");
		}
	}



	private getTargetPath(projectPath: string, session: ParsedCodexSession) {
		const id = String(session.meta.id ?? sha1Hash(session.sourcePath)).replace(/[^a-zA-Z0-9_-]/g, "-");
		return join(projectSessionDir(this.piRoot, projectPath), `codex_${id}.jsonl`);
	}



	private extractCodexText(payload: Record<string, any>) {
		const content = payload.content ?? payload.summary ?? payload.text ?? payload.output;
		if (typeof content === "string") return content;
		if (!Array.isArray(content)) return "";
		return content
			.map((item) => {
				if (typeof item === "string") return item;
				if (!item || typeof item !== "object") return "";
				return String(item.text ?? item.message ?? item.content ?? "");
			})
			.filter(Boolean)
			.join("\n");
	}

	private extractToolOutput(payload: Record<string, any>) {
		const output = payload.output ?? payload.content;
		if (typeof output === "string") return output;
		if (Array.isArray(output)) return this.extractCodexText({ content: output });
		return stringifyToolOutput(output);
	}

	private parseArguments(value: unknown) {
		if (typeof value !== "string") return value ?? {};
		try {
			return JSON.parse(value);
		} catch {
			return { input: value };
		}
	}

	private parseTimestamp(value: unknown) {
		if (typeof value === "number" && Number.isFinite(value)) return value;
		if (typeof value !== "string") return undefined;
		const parsed = Date.parse(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	}





	private joinText(a: string, b: string) {
		if (!a) return b;
		if (!b) return a;
		return `${a}\n\n${b}`;
	}

}

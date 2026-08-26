import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Claude / Codex / OpenCode 三个会话导入器共用的纯函数工具。
 *
 * 三者的差异只在「如何解析各家的原始会话」，而写入 pi 会话文件所需的
 * ID 生成、标题清洗、项目目录编码、导入元数据回读等逻辑完全一致。
 * 此前三份各自维护的副本已出现细微漂移（如 collectJsonl 是否吞异常），
 * 收敛到一处以保证导入行为一致。
 */

/** 会话条目 ID 的稳定哈希（同一会话同一序号必然得到同一 ID，重复导入可幂等覆盖） */
export function sha1Hash(value: string): string {
	return createHash("sha1").update(value).digest("hex");
}

/** pi 会话条目 ID：取 sessionId + 序号哈希的前 8 位 */
export function makeEntryId(sessionId: string, sequence: number): string {
	return sha1Hash(`${sessionId}:${sequence}`).slice(0, 8);
}

/**
 * 会话标题清洗：压缩空白、丢弃占位标题、超长截断。
 * 返回空串表示「没有可用标题」，调用方再回退到文件名等。
 */
export function cleanSessionTitle(value?: string): string {
	const text = value?.replace(/\s+/g, " ").trim();
	if (!text || /^untitled$/i.test(text)) return "";
	return text.length > 40 ? `${text.slice(0, 40)}...` : text;
}

/** 从 pi 消息 content 数组中提取可读文本，用于生成标题和预览 */
export function extractPiText(content: unknown[]): string {
	return content
		.map((item: any) => item?.text ?? item?.thinking ?? item?.name ?? "")
		.filter(Boolean)
		.join(" ");
}

/** 路径归一化（统一分隔符、去尾部斜杠、小写），仅用于比较，不用于落盘 */
export function normalizeSessionPath(path?: string): string {
	return String(path ?? "")
		.replace(/\\/g, "/")
		.replace(/\/+$/, "")
		.toLowerCase();
}

/** 项目路径 → pi 会话目录名（Windows 盘符单独编码，避免出现非法目录名） */
export function safeProjectPathToken(path: string): string {
	const normalized = path.replace(/\\/g, "/");
	const win = normalized.match(/^([A-Za-z]):\/(.+)$/);
	if (win) return `--${win[1]}--${win[2].replace(/\//g, "-")}--`;
	return `--${normalized.replace(/^\//, "").replace(/\//g, "-")}--`;
}

/** 某个项目在 pi 会话根目录下的存放目录 */
export function projectSessionDir(piRoot: string, projectPath: string): string {
	return join(piRoot, safeProjectPathToken(projectPath));
}

/** 导入的历史会话没有真实 token 统计，用零值占位保持 pi 会话结构完整 */
export function zeroUsage() {
	return {
		input: 0,
		output: 0,
		cacheRead: 0,
		cacheWrite: 0,
		totalTokens: 0,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
	};
}

/**
 * 递归收集目录下的 .jsonl 文件。
 * 目录不可读时返回已收集到的部分而不是整体失败，避免单个损坏目录让扫描全废。
 */
export async function collectJsonlFiles(dir: string): Promise<string[]> {
	const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
	const files: string[] = [];
	for (const entry of entries) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) files.push(...(await collectJsonlFiles(path)));
		else if (entry.isFile() && entry.name.endsWith(".jsonl")) files.push(path);
	}
	return files;
}

/**
 * 从已导入的目标会话文件头部读回导入元数据，用于判断源文件是否更新过。
 * @param entryType 各导入器写入的标记类型，如 claude_import / codex_import / opencode_import
 */
export async function readImportMeta(
	targetPath: string,
	entryType: string,
): Promise<{ sourceMtime: number; sourceSize: number } | undefined> {
	try {
		const raw = await readFile(targetPath, "utf8");
		// 导入标记总在会话文件开头几行，无需整文件扫描
		for (const line of raw.split(/\r?\n/).filter(Boolean).slice(0, 8)) {
			const entry = JSON.parse(line) as any;
			if (entry.type === entryType) {
				return {
					sourceMtime: Number(entry.sourceMtime),
					sourceSize: Number(entry.sourceSize),
				};
			}
		}
	} catch {
		return undefined;
	}
	return undefined;
}

/** 工具调用输出的兜底序列化：字符串原样返回，对象转 JSON，循环引用时退化为 String() */
export function stringifyToolOutput(output: unknown): string {
	if (typeof output === "string") return output;
	try {
		return JSON.stringify(output ?? "", null, 2);
	} catch {
		return String(output ?? "");
	}
}

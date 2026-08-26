/**
 * SKILL.md / prompt 模板等 Markdown 资源的 YAML frontmatter 读写工具。
 *
 * Skill、项目资源、Prompt 模板三处管理器都需要解析同一种「`---` 包裹的
 * key: value 列表」，此前各自维护一份实现，行为漂移会直接表现为
 * 「全局 Skill 能识别但项目 Skill 不能」这类不一致 bug，故收敛到一处。
 */

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---/;

/**
 * 解析 frontmatter 为扁平的字符串键值对。
 * 仅支持单行 `key: value`（pi 的 SKILL.md 规范如此），无 frontmatter 时返回空对象。
 */
export function parseFrontmatter(raw: string): Record<string, string> {
	const match = raw.match(FRONTMATTER_PATTERN);
	const result: Record<string, string> = {};
	if (!match) return result;
	for (const line of match[1].split(/\r?\n/)) {
		const index = line.indexOf(":");
		if (index === -1) continue;
		const key = line.slice(0, index).trim();
		// 去掉值两端的引号，让 `name: "foo"` 与 `name: foo` 等价
		const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
		if (key) result[key] = value;
	}
	return result;
}

/**
 * 写入或更新某个 frontmatter 字段。
 * @param appendWhenMissing 字段不存在时是否追加；false 表示只改已有字段（历史行为差异，见调用方）
 */
export function setFrontmatterField(
	raw: string,
	key: string,
	value: string | boolean,
	appendWhenMissing = true,
): string {
	const match = raw.match(FRONTMATTER_PATTERN);
	// 完全没有 frontmatter 时补一段，避免后续读取拿不到字段
	if (!match) return `---\n${key}: ${value}\n---\n\n${raw}`;
	let changed = false;
	const nextLines = match[1].split(/\r?\n/).map((line) => {
		if (!line.trim().startsWith(`${key}:`)) return line;
		changed = true;
		return `${key}: ${value}`;
	});
	if (!changed && appendWhenMissing) nextLines.push(`${key}: ${value}`);
	return raw.replace(match[0], `---\n${nextLines.join("\n")}\n---`);
}

/** 更新 frontmatter 中的 name 字段（不存在时不追加，保持既有重命名行为） */
export function setFrontmatterName(raw: string, name: string): string {
	return setFrontmatterField(raw, "name", name, false);
}

/** 更新 frontmatter 中的布尔字段（如 disable-model-invocation），不存在时追加 */
export function setFrontmatterBoolean(raw: string, key: string, value: boolean): string {
	return setFrontmatterField(raw, key, value, true);
}

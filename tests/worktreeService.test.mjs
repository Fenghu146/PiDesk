import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import ts from "typescript";
import vm from "node:vm";

const nodeRequire = createRequire(import.meta.url);

/**
 * 加载 WorktreeService，并把 git 调用、目录探测、目录删除全部替换成可断言的桩，
 * 避免测试真的创建 git worktree。
 */
function loadWorktreeService({ git, existing = [] } = {}) {
	const { outputText } = ts.transpileModule(
		readFileSync("src/main/git/WorktreeService.ts", "utf8"),
		{ compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
	);

	const calls = [];
	const removed = [];
	const existingPaths = new Set(existing);

	const execFile = () => {
		throw new Error("callback form of execFile is not used by WorktreeService");
	};
	// promisify(execFile) 走 util.promisify.custom，直接返回 { stdout } 形状
	execFile[promisify.custom] = async (file, args, options) => {
		calls.push({ file, args, cwd: options?.cwd });
		return git(file, args, options) ?? { stdout: "", stderr: "" };
	};

	const modules = {
		"node:child_process": { execFile },
		"node:fs": { existsSync: (path) => existingPaths.has(path) },
		"node:fs/promises": {
			rm: async (path, options) => {
				removed.push({ path, options });
			},
			realpath: async (path) => path,
		},
		"node:util": { promisify },
	};

	const factory = vm.runInThisContext(`(function (exports, require) {\n${outputText}\n})`, {
		filename: "WorktreeService.ts",
	});
	const exports = {};
	factory(exports, (id) => modules[id] ?? nodeRequire(id));
	return { WorktreeService: exports.WorktreeService, calls, removed };
}

// 用 resolve 构造路径，保证断言在 POSIX 与 Windows 上都与实现的规范化结果一致
const PROJECT = resolve("/home/dev/project");
const sibling = (name) => join(dirname(PROJECT), name);

function porcelain(entries) {
	return entries
		.map(({ path, branch, detached }) => {
			const lines = [`worktree ${path}`, "HEAD 0123456789abcdef"];
			if (branch) lines.push(`branch ${branch}`);
			if (detached) lines.push("detached");
			return `${lines.join("\n")}\n`;
		})
		.join("\n");
}

test("list parses porcelain output and excludes the main worktree", async () => {
	const stdout = porcelain([
		{ path: PROJECT, branch: "refs/heads/main" },
		{ path: sibling("feature-a"), branch: "refs/heads/feature-a" },
		{ path: sibling("detached"), detached: true },
	]);
	const { WorktreeService } = loadWorktreeService({ git: () => ({ stdout }) });

	const entries = await new WorktreeService().list(PROJECT);

	assert.deepEqual(entries, [
		{ path: sibling("feature-a"), branch: "feature-a" },
		{ path: sibling("detached"), branch: "detached" },
	]);
});

test("list keeps the last entry when the output has no trailing blank line", async () => {
	const stdout = `worktree ${PROJECT}\nbranch refs/heads/main\n\nworktree ${sibling("last")}\nbranch refs/heads/last`;
	const { WorktreeService } = loadWorktreeService({ git: () => ({ stdout }) });

	const entries = await new WorktreeService().list(PROJECT);

	assert.deepEqual(entries, [{ path: sibling("last"), branch: "last" }]);
});

test("list returns an empty array when git fails", async () => {
	const { WorktreeService } = loadWorktreeService({
		git: () => {
			throw new Error("not a git repository");
		},
	});

	assert.deepEqual(await new WorktreeService().list(PROJECT), []);
});

test("create slugifies the branch, keeps unicode and puts the worktree beside the project", async () => {
	const { WorktreeService, calls } = loadWorktreeService({
		git: (_file, args) => {
			if (args[0] === "show-ref") throw new Error("no such ref");
			return { stdout: "" };
		},
	});

	const result = await new WorktreeService().create(PROJECT, "project-1", "  修复 login/bug!  ");

	assert.deepEqual(result, { path: sibling("修复-login-bug"), branch: "修复-login-bug" });
	const add = calls.find((call) => call.args[0] === "worktree" && call.args[1] === "add");
	assert.deepEqual(add.args, ["worktree", "add", "--no-checkout", "-b", "修复-login-bug", sibling("修复-login-bug")]);
	assert.equal(add.cwd, PROJECT);
	// 目录只创建结构，内容由 worktree 目录内的 reset --hard 填充
	assert.deepEqual(calls.at(-1), { file: "git", args: ["reset", "--hard"], cwd: sibling("修复-login-bug") });
});

test("create falls back to the workspace slug when the name has no usable characters", async () => {
	const { WorktreeService } = loadWorktreeService({
		git: (_file, args) => {
			if (args[0] === "show-ref") throw new Error("no such ref");
			return { stdout: "" };
		},
	});

	const result = await new WorktreeService().create(PROJECT, "project-1", "///");

	assert.equal(result.branch, "workspace");
	assert.equal(result.path, sibling("workspace"));
});

test("create refuses to reuse an existing directory or branch", async () => {
	const existingDir = loadWorktreeService({
		git: () => ({ stdout: "" }),
		existing: [sibling("feature")],
	});
	await assert.rejects(
		new existingDir.WorktreeService().create(PROJECT, "p", "feature"),
		new RegExp(`工作区目录已存在：${sibling("feature").replace(/\\/g, "\\\\")}`),
	);

	const existingBranch = loadWorktreeService({ git: () => ({ stdout: "" }) });
	await assert.rejects(
		new existingBranch.WorktreeService().create(PROJECT, "p", "feature"),
		/分支已存在：feature/,
	);
});

test("create cleans up the half-initialized worktree when reset fails", async () => {
	const listOutput = porcelain([
		{ path: PROJECT, branch: "refs/heads/main" },
		{ path: sibling("feature"), branch: "refs/heads/feature" },
	]);
	const { WorktreeService, calls, removed } = loadWorktreeService({
		git: (_file, args) => {
			if (args[0] === "show-ref") throw new Error("no such ref");
			if (args[0] === "reset") throw new Error("reset exploded");
			if (args[0] === "worktree" && args[1] === "list") return { stdout: listOutput };
			return { stdout: "" };
		},
	});

	await assert.rejects(new WorktreeService().create(PROJECT, "p", "feature"), /reset exploded/);

	assert.deepEqual(removed.map((entry) => entry.path), [sibling("feature")]);
	assert.ok(calls.some((call) => call.args[0] === "worktree" && call.args[1] === "remove"));
});

test("remove deletes the worktree and its matching same-named branch", async () => {
	const listOutput = porcelain([
		{ path: PROJECT, branch: "refs/heads/main" },
		{ path: sibling("feature"), branch: "refs/heads/feature" },
	]);
	const { WorktreeService, calls, removed } = loadWorktreeService({
		git: (_file, args) => (args[0] === "worktree" && args[1] === "list" ? { stdout: listOutput } : { stdout: "" }),
	});

	assert.equal(await new WorktreeService().remove(sibling("feature"), PROJECT), true);

	assert.deepEqual(removed[0], { path: sibling("feature"), options: { recursive: true, force: true } });
	assert.deepEqual(
		calls.filter((call) => call.args[0] === "branch").map((call) => call.args),
		[["branch", "-D", "feature"]],
	);
});

test("remove keeps a foreign branch that does not match the worktree directory", async () => {
	const listOutput = porcelain([
		{ path: PROJECT, branch: "refs/heads/main" },
		{ path: sibling("external"), branch: "refs/heads/someone-else" },
	]);
	const { WorktreeService, calls } = loadWorktreeService({
		git: (_file, args) => (args[0] === "worktree" && args[1] === "list" ? { stdout: listOutput } : { stdout: "" }),
	});

	assert.equal(await new WorktreeService().remove(sibling("external"), PROJECT), true);
	assert.equal(calls.some((call) => call.args[0] === "branch"), false);
});

test("remove reports false for a path git does not track as a worktree", async () => {
	const listOutput = porcelain([{ path: PROJECT, branch: "refs/heads/main" }]);
	const { WorktreeService, calls, removed } = loadWorktreeService({
		git: () => ({ stdout: listOutput }),
	});

	assert.equal(await new WorktreeService().remove(sibling("unknown"), PROJECT), false);
	assert.deepEqual(removed, []);
	assert.equal(calls.length, 1, "未跟踪的路径不应触发任何删除命令");
});

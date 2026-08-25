import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const nodeRequire = createRequire(import.meta.url);

function transpile(filePath) {
	return ts.transpileModule(readFileSync(filePath, "utf8"), {
		compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
	}).outputText;
}

function instantiate(filePath, name, requireImpl, extraGlobals = {}) {
	const params = ["exports", "require", ...Object.keys(extraGlobals)];
	const factory = vm.runInThisContext(
		`(function (${params.join(", ")}) {\n${transpile(filePath)}\n})`,
		{ filename: name },
	);
	const exports = {};
	factory(exports, requireImpl, ...Object.values(extraGlobals));
	return exports;
}

/**
 * 加载 EditorDetector。文件系统探测、spawn 和 electron shell 全部替换成桩，
 * platform / PATH 也可注入，使 Windows 分支能在任意宿主平台上被验证。
 */
function loadEditorDetector({
	platform = "linux",
	existing = [],
	env = {},
	spawnResult = "spawn",
} = {}) {
	const existingPaths = new Set(existing);
	const spawns = [];
	const openedPaths = [];
	const fakeProcess = {
		...process,
		platform,
		env: { ...process.env, ...env },
	};

	const sharedTypes = instantiate("src/shared/types.ts", "types.ts", nodeRequire);
	const modules = {
		"../../shared/types": sharedTypes,
		electron: {
			shell: {
				openPath: async (path) => {
					openedPaths.push(path);
					return "";
				},
			},
		},
		"node:fs/promises": {
			access: async (path) => {
				if (!existingPaths.has(path)) throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
			},
		},
		"node:path": platform === "win32" ? nodeRequire("node:path").win32 : nodeRequire("node:path").posix,
		"node:child_process": {
			spawn: (command, args) => {
				const listeners = new Map();
				const child = {
					pid: 4321,
					unref: () => {},
					once: (event, handler) => {
						listeners.set(event, handler);
						return child;
					},
				};
				spawns.push({ command, args });
				setTimeout(() => {
					if (spawnResult === "error") listeners.get("error")?.(new Error("ENOENT"));
					else listeners.get("spawn")?.();
				}, 0);
				return child;
			},
		},
	};

	const exports = instantiate(
		"src/main/editors/EditorDetector.ts",
		"EditorDetector.ts",
		(id) => modules[id] ?? nodeRequire(id),
		{ process: fakeProcess, console: { log: () => {}, error: () => {}, warn: () => {} } },
	);
	return { ...exports, sharedTypes, spawns, openedPaths };
}

function settingsWith(externalEditors) {
	return { externalEditors };
}

test("detectExternalEditors prefers PATH over common install paths", async () => {
	const detector = loadEditorDetector({
		platform: "linux",
		env: { PATH: "/usr/local/bin:/usr/bin" },
		existing: ["/usr/local/bin/code", "/usr/bin/zed"],
	});

	const editors = await detector.detectExternalEditors();

	assert.deepEqual(
		editors.map((editor) => [editor.id, editor.command, editor.detectedFrom]),
		[["vscode", "/usr/local/bin/code", "path"], ["zed", "/usr/bin/zed", "path"]],
	);
});

test("detectExternalEditors falls back to a common install path when PATH has nothing", async () => {
	const detector = loadEditorDetector({
		platform: "linux",
		env: { PATH: "/empty" },
		existing: ["/snap/bin/code"],
	});

	const editors = await detector.detectExternalEditors();

	assert.deepEqual(editors, [
		{ id: "vscode", name: "Visual Studio Code", command: "/snap/bin/code", args: undefined, detectedFrom: "common-path" },
	]);
});

test("detectExternalEditors returns nothing when no editor is installed", async () => {
	const detector = loadEditorDetector({ platform: "linux", env: { PATH: "/empty" } });

	assert.deepEqual(await detector.detectExternalEditors(), []);
});

test("mergeDetectedExternalEditors enables detected editors on top of defaults", () => {
	const detector = loadEditorDetector();

	const merged = detector.mergeDetectedExternalEditors(undefined, [
		{ id: "vscode", name: "Visual Studio Code", command: "/usr/bin/code", detectedFrom: "path" },
	]);

	assert.deepEqual(merged.vscode.enabled, true);
	assert.equal(merged.vscode.command, "/usr/bin/code");
	assert.equal(merged.vscode.detectedFrom, "path");
	assert.equal(typeof merged.vscode.updatedAt, "number");
	// 未检测到的编辑器保持默认关闭状态
	assert.deepEqual(merged.cursor, { enabled: false, command: "" });
});

test("mergeDetectedExternalEditors never overwrites a manual command", () => {
	const detector = loadEditorDetector();
	const current = {
		...detector.sharedTypes.createDefaultExternalEditorSettings(),
		vscode: { enabled: true, command: "/opt/custom/code", detectedFrom: "manual" },
		cursor: { enabled: false, command: "", detectedFrom: "manual" },
	};

	const merged = detector.mergeDetectedExternalEditors(current, [
		{ id: "vscode", name: "Visual Studio Code", command: "/usr/bin/code", detectedFrom: "path" },
		{ id: "cursor", name: "Cursor", command: "/usr/bin/cursor", detectedFrom: "path" },
	]);

	assert.equal(merged.vscode.command, "/opt/custom/code");
	// manual 但没有命令的条目不算用户配置，仍然接受检测结果
	assert.equal(merged.cursor.command, "/usr/bin/cursor");
});

test("listConfiguredExternalEditors skips disabled, empty and missing commands", async () => {
	const detector = loadEditorDetector({ platform: "linux", existing: ["/usr/bin/code"] });

	const editors = await detector.listConfiguredExternalEditors(
		settingsWith({
			vscode: { enabled: true, command: "/usr/bin/code", detectedFrom: "path" },
			cursor: { enabled: false, command: "/usr/bin/cursor" },
			zed: { enabled: true, command: "" },
			idea: { enabled: true, command: "/usr/bin/idea-missing" },
		}),
	);

	assert.deepEqual(editors, [
		{ id: "vscode", name: "Visual Studio Code", command: "/usr/bin/code", detectedFrom: "path" },
	]);
});

test("listConfiguredExternalEditors resolves a Windows shell shim to the GUI executable", async () => {
	const detector = loadEditorDetector({
		platform: "win32",
		existing: ["C:\\Tools\\VS Code\\Code.exe"],
	});

	const editors = await detector.listConfiguredExternalEditors(
		settingsWith({
			vscode: { enabled: true, command: "C:\\Tools\\VS Code\\bin\\code" },
		}),
	);

	assert.deepEqual(editors, [
		{ id: "vscode", name: "Visual Studio Code", command: "C:\\Tools\\VS Code\\Code.exe", detectedFrom: "manual" },
	]);
});

test("listConfiguredExternalEditors falls back to the .cmd sibling of an extension-less shim", async () => {
	const detector = loadEditorDetector({
		platform: "win32",
		existing: ["C:\\Tools\\VS Code\\bin\\code.cmd"],
	});

	const editors = await detector.listConfiguredExternalEditors(
		settingsWith({ vscode: { enabled: true, command: "C:\\Tools\\VS Code\\bin\\code" } }),
	);

	assert.deepEqual(editors.map((editor) => editor.command), ["C:\\Tools\\VS Code\\bin\\code.cmd"]);
});

test("listConfiguredExternalEditors drops a Windows command that cannot be launched", async () => {
	const detector = loadEditorDetector({ platform: "win32", existing: [] });

	const editors = await detector.listConfiguredExternalEditors(
		settingsWith({ vscode: { enabled: true, command: "C:\\Tools\\VS Code\\bin\\code" } }),
	);

	assert.deepEqual(editors, []);
});

test("validateExternalEditorCommand trims input and checks existence", async () => {
	const detector = loadEditorDetector({ platform: "linux", existing: ["/usr/bin/code"] });

	assert.deepEqual(await detector.validateExternalEditorCommand("  /usr/bin/code  "), {
		valid: true,
		command: "/usr/bin/code",
	});
	assert.deepEqual(await detector.validateExternalEditorCommand("/usr/bin/nope"), {
		valid: false,
		command: "/usr/bin/nope",
	});
	assert.deepEqual(await detector.validateExternalEditorCommand("   "), { valid: false, command: "" });
});

test("openProjectInEditor spawns the editor with a new window for vscode", async () => {
	const detector = loadEditorDetector({ platform: "linux", existing: ["/usr/bin/code"] });

	await detector.openProjectInEditor(
		{ id: "vscode", name: "Visual Studio Code", command: "/usr/bin/code", detectedFrom: "path" },
		"/home/dev/project",
	);

	assert.deepEqual(detector.spawns, [
		{ command: "/usr/bin/code", args: ["--new-window", "/home/dev/project"] },
	]);
	assert.deepEqual(detector.openedPaths, []);
});

test("openProjectInEditor converts WSL /mnt paths to Windows drive paths", async () => {
	const detector = loadEditorDetector({ platform: "win32", existing: ["C:\\Tools\\cursor.exe"] });

	await detector.openProjectInEditor(
		{ id: "cursor", name: "Cursor", command: "C:\\Tools\\cursor.exe", detectedFrom: "manual" },
		"/mnt/d/work/repo",
	);

	assert.deepEqual(detector.spawns, [{ command: "C:\\Tools\\cursor.exe", args: ["D:\\work\\repo"] }]);
});

test("openProjectInEditor keeps a non /mnt WSL path unchanged", async () => {
	const detector = loadEditorDetector({ platform: "win32", existing: ["C:\\Tools\\cursor.exe"] });

	await detector.openProjectInEditor(
		{ id: "cursor", name: "Cursor", command: "C:\\Tools\\cursor.exe", detectedFrom: "manual" },
		"/home/dev/repo",
	);

	assert.deepEqual(detector.spawns, [{ command: "C:\\Tools\\cursor.exe", args: ["/home/dev/repo"] }]);
});

test("openProjectInEditor launches .cmd shims through cmd start with quoted arguments", async () => {
	const detector = loadEditorDetector({
		platform: "win32",
		existing: ["C:\\Tools\\VS Code\\bin\\code.cmd"],
		env: { ComSpec: "C:\\Windows\\System32\\cmd.exe" },
	});

	await detector.openProjectInEditor(
		{ id: "vscode", name: "Visual Studio Code", command: "C:\\Tools\\VS Code\\bin\\code.cmd", detectedFrom: "manual" },
		"D:\\my project",
	);

	assert.deepEqual(detector.spawns, [
		{
			command: "C:\\Windows\\System32\\cmd.exe",
			args: [
				"/d",
				"/s",
				"/c",
				'start "" "C:\\Tools\\VS Code\\bin\\code.cmd" "--new-window" "D:\\my project"',
			],
		},
	]);
});

test("openProjectInEditor falls back to shell.openPath when spawn fails", async () => {
	const detector = loadEditorDetector({
		platform: "linux",
		existing: ["/usr/bin/code"],
		spawnResult: "error",
	});

	await detector.openProjectInEditor(
		{ id: "vscode", name: "Visual Studio Code", command: "/usr/bin/code", detectedFrom: "path" },
		"/home/dev/project",
	);

	assert.deepEqual(detector.openedPaths, ["/home/dev/project"]);
});

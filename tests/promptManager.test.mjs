import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

const nodeRequire = createRequire(import.meta.url);

/** 加载 PromptManager，仅替换 electron shell，其余走真实文件系统（临时目录）。 */
function loadPromptManager() {
	const { outputText } = ts.transpileModule(
		readFileSync("src/main/prompts/PromptManager.ts", "utf8"),
		{ compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
	);
	const openedPaths = [];
	const modules = {
		electron: {
			shell: {
				openPath: async (path) => {
					openedPaths.push(path);
					return "";
				},
			},
		},
	};
	const factory = vm.runInThisContext(`(function (exports, require) {\n${outputText}\n})`, {
		filename: "PromptManager.ts",
	});
	const exports = {};
	factory(exports, (id) => modules[id] ?? nodeRequire(id));
	return { PromptManager: exports.PromptManager, openedPaths };
}

async function withHome(run) {
	const home = await mkdtemp(join(tmpdir(), "pideck-prompts-"));
	try {
		await run(home);
	} finally {
		await rm(home, { recursive: true, force: true });
	}
}

const promptsDir = (home) => join(home, ".pi", "agent", "prompts");

async function seedGlobalTemplate(home, fileName, content) {
	await mkdir(promptsDir(home), { recursive: true });
	await writeFile(join(promptsDir(home), fileName), content, "utf8");
}

test("getDir points at the pi prompts directory of the given home", async () => {
	await withHome(async (home) => {
		const { PromptManager } = loadPromptManager();
		assert.equal(new PromptManager(home).getDir(), promptsDir(home));
	});
});

test("configureWsl repoints the prompts directory at the WSL windows home", async () => {
	await withHome(async (home) => {
		await withHome(async (wslHome) => {
			const { PromptManager } = loadPromptManager();
			const manager = new PromptManager(home);
			manager.configureWsl({ windowsHome: wslHome });
			assert.equal(manager.getDir(), promptsDir(wslHome));
			manager.configureWsl(null);
			assert.notEqual(manager.getDir(), promptsDir(wslHome));
		});
	});
});

test("list creates the directory, parses frontmatter and merges builtin templates", async () => {
	await withHome(async (home) => {
		const { PromptManager } = loadPromptManager();
		await seedGlobalTemplate(home, "deploy.md", '---\ndescription: "Deploy the app"\n---\n\nrun deploy\n');
		await seedGlobalTemplate(home, "notes.d.md", "---\ndescription: ignored\n---\n");
		await seedGlobalTemplate(home, "readme.txt", "not a template");
		await seedGlobalTemplate(home, "empty.md", "");

		const { templates, globalDir } = await new PromptManager(home).list();

		assert.equal(globalDir, promptsDir(home));
		const deploy = templates.find((template) => template.name === "deploy");
		assert.equal(deploy.description, "Deploy the app");
		assert.equal(deploy.userCreated, true);
		assert.equal(deploy.scope, "global");
		// .d.md、非 md 和空文件都不应出现在列表中
		assert.equal(templates.some((template) => ["notes.d", "readme", "empty"].includes(template.name)), false);
		// 内置推荐模板始终附加，且列表按名称排序
		assert.ok(templates.some((template) => template.name === "review" && template.userCreated === false));
		assert.deepEqual(
			templates.map((template) => template.name),
			[...templates.map((template) => template.name)].sort((a, b) => a.localeCompare(b)),
		);
	});
});

test("list falls back to the first non-empty line when frontmatter has no description", async () => {
	await withHome(async (home) => {
		const { PromptManager } = loadPromptManager();
		await seedGlobalTemplate(home, "plain.md", "\n\nJust do the thing\nmore text\n");

		const { templates } = await new PromptManager(home).list();

		assert.equal(templates.find((template) => template.name === "plain").description, "Just do the thing");
	});
});

test("a user template shadows the builtin template of the same name", async () => {
	await withHome(async (home) => {
		const { PromptManager } = loadPromptManager();
		await seedGlobalTemplate(home, "review.md", "---\ndescription: my own review\n---\n");

		const { templates } = await new PromptManager(home).list();
		const reviews = templates.filter((template) => template.name === "review");

		assert.equal(reviews.length, 1);
		assert.equal(reviews[0].userCreated, true);
		assert.equal(reviews[0].description, "my own review");
	});
});

test("create normalizes the name, writes frontmatter only and rejects duplicates", async () => {
	await withHome(async (home) => {
		const { PromptManager } = loadPromptManager();
		const manager = new PromptManager(home);
		await manager.list();

		const created = await manager.create({ name: "  My Deploy Script ", description: "  ship it  " });

		assert.equal(created.name, "my-deploy-script");
		assert.equal(created.path, join(promptsDir(home), "my-deploy-script.md"));
		assert.equal(await readFile(created.path, "utf8"), "---\ndescription: ship it\n---\n");
		await assert.rejects(manager.create({ name: "my-deploy-script", description: "again" }), /模板已存在/);
	});
});

test("create keeps unicode names and collapses separator runs", async () => {
	await withHome(async (home) => {
		const { PromptManager } = loadPromptManager();
		const manager = new PromptManager(home);
		await manager.list();

		const created = await manager.create({ name: "代码 // 审查", description: "审查" });

		assert.equal(created.name, "代码-审查");
	});
});

test("create rejects an empty name or description", async () => {
	await withHome(async (home) => {
		const { PromptManager } = loadPromptManager();
		const manager = new PromptManager(home);
		await manager.list();

		await assert.rejects(manager.create({ name: "///", description: "valid" }), /模板名称不能为空/);
		await assert.rejects(manager.create({ name: "valid", description: "   " }), /模板描述不能为空/);
	});
});

test("delete only removes files inside the global prompts directory", async () => {
	await withHome(async (home) => {
		const { PromptManager } = loadPromptManager();
		const manager = new PromptManager(home);
		await seedGlobalTemplate(home, "temp.md", "---\ndescription: temp\n---\n");
		const outside = join(home, "outside.md");
		await writeFile(outside, "x", "utf8");

		await assert.rejects(manager.delete(outside), /只能删除全局 prompt templates 目录下的文件/);
		await assert.rejects(manager.delete(join(promptsDir(home), "ghost.md")), /模板文件不存在/);

		await manager.delete(join(promptsDir(home), "temp.md"));
		const { templates } = await manager.list();
		assert.equal(templates.some((template) => template.name === "temp"), false);
	});
});

test("writeContent refuses paths outside the global prompts directory", async () => {
	await withHome(async (home) => {
		const { PromptManager } = loadPromptManager();
		const manager = new PromptManager(home);
		await seedGlobalTemplate(home, "edit-me.md", "---\ndescription: old\n---\n");
		const target = join(promptsDir(home), "edit-me.md");

		await manager.writeContent(target, "---\ndescription: new\n---\nbody");
		assert.equal(await manager.readContent(target), "---\ndescription: new\n---\nbody");
		await assert.rejects(manager.writeContent(join(home, "elsewhere.md"), "x"), /只能修改全局/);
	});
});

test("rename moves the template file and returns the refreshed summary", async () => {
	await withHome(async (home) => {
		const { PromptManager } = loadPromptManager();
		const manager = new PromptManager(home);
		await seedGlobalTemplate(home, "old-name.md", "---\ndescription: 'still here'\n---\nbody\n");

		const renamed = await manager.rename("Old Name", "New Name");

		assert.equal(renamed.name, "new-name");
		assert.equal(renamed.description, "still here");
		assert.equal(renamed.content, "---\ndescription: 'still here'\n---\nbody\n");
		const { templates } = await manager.list();
		assert.equal(templates.some((template) => template.name === "old-name"), false);
	});
});

test("rename validates names, missing sources and existing targets", async () => {
	await withHome(async (home) => {
		const { PromptManager } = loadPromptManager();
		const manager = new PromptManager(home);
		await seedGlobalTemplate(home, "a.md", "---\ndescription: a\n---\n");
		await seedGlobalTemplate(home, "b.md", "---\ndescription: b\n---\n");

		await assert.rejects(manager.rename("///", "b"), /模板名称不能为空/);
		await assert.rejects(manager.rename("a", "A"), /新旧名称相同/);
		await assert.rejects(manager.rename("missing", "c"), /模板不存在：missing/);
		await assert.rejects(manager.rename("a", "b"), /模板已存在：b/);
	});
});

test("project templates are listed, created, renamed and deleted under .pi/prompts", async () => {
	await withHome(async (home) => {
		await withHome(async (projectPath) => {
			const { PromptManager } = loadPromptManager();
			const manager = new PromptManager(home);
			const projectDir = join(projectPath, ".pi", "prompts");

			assert.deepEqual(await manager.listByProject(projectPath), { templates: [], globalDir: projectDir });

			const created = await manager.createInProject(projectPath, { name: "Team Review", description: "team" });
			assert.equal(created.scope, "project");
			assert.equal(created.path, join(projectDir, "team-review.md"));

			const listed = await manager.listByProject(projectPath);
			assert.deepEqual(listed.templates.map((template) => [template.name, template.scope]), [["team-review", "project"]]);
			// 项目级列表不合并内置模板
			assert.equal(listed.templates.length, 1);

			const renamed = await manager.renameInProject(projectPath, "team-review", "squad review");
			assert.equal(renamed.name, "squad-review");
			assert.equal(renamed.description, "team");

			await manager.deleteFromProject(projectPath, "squad-review.md");
			assert.deepEqual((await manager.listByProject(projectPath)).templates, []);
			await assert.rejects(manager.deleteFromProject(projectPath, "squad-review.md"), /模板文件不存在/);
		});
	});
});

test("createInProject rejects duplicates and invalid input", async () => {
	await withHome(async (home) => {
		await withHome(async (projectPath) => {
			const { PromptManager } = loadPromptManager();
			const manager = new PromptManager(home);
			await manager.createInProject(projectPath, { name: "dup", description: "first" });

			await assert.rejects(manager.createInProject(projectPath, { name: "dup", description: "second" }), /模板已存在：dup/);
			await assert.rejects(manager.createInProject(projectPath, { name: "///", description: "x" }), /模板名称不能为空/);
			await assert.rejects(manager.createInProject(projectPath, { name: "ok", description: " " }), /模板描述不能为空/);
		});
	});
});

test("openFolder creates the directory and reveals it through the shell", async () => {
	await withHome(async (home) => {
		const { PromptManager, openedPaths } = loadPromptManager();
		const manager = new PromptManager(home);

		await manager.openFolder();

		assert.deepEqual(openedPaths, [promptsDir(home)]);
		assert.deepEqual((await manager.listByProject(home)).templates, []);
	});
});

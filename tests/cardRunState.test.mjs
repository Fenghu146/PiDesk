import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

function loadCardRunState() {
	const source = readFileSync("src/main/feishu/CardRunState.ts", "utf8");
	const { outputText } = ts.transpileModule(source, {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2022,
		},
	});
	// 在当前 realm 内执行，保证返回对象与测试断言共享内置原型（deepEqual 可用）
	const factory = vm.runInThisContext(`(function (exports) {\n${outputText}\n})`, {
		filename: "CardRunState.ts",
	});
	const exports = {};
	factory(exports);
	return exports;
}

function textDelta(delta) {
	return { type: "message_update", assistantMessageEvent: { type: "text_delta", delta } };
}

function thinkingDelta(delta) {
	return { type: "message_update", assistantMessageEvent: { type: "thinking_delta", delta } };
}

function reduceAll(mod, events, state = mod.createInitialState()) {
	return events.reduce((acc, event) => mod.reduceFromPiEvent(acc, event), state);
}

function textBlocks(state) {
	return state.blocks.filter((block) => block.kind === "text");
}

function toolBlocks(state) {
	return state.blocks.filter((block) => block.kind === "tool");
}

test("streams assistant text into a single block and accumulates outputText", () => {
	const mod = loadCardRunState();
	const state = reduceAll(mod, [
		{ type: "agent_start" },
		{ type: "message_start", message: { role: "assistant" } },
		textDelta("Hel"),
		textDelta("lo"),
	]);

	assert.equal(state.outputText, "Hello");
	assert.equal(textBlocks(state).length, 1);
	assert.deepEqual(textBlocks(state)[0], { kind: "text", content: "Hello", streaming: true });
	assert.equal(state.footer, "streaming");
	assert.equal(state.terminal, "running");
	// message_start 只开启一个空文本块，不应该额外污染输出文本
	assert.ok(state.trail.some((entry) => entry.type === "agent" && entry.text === "agent 启动"));
});

test("ignores unknown events and non-assistant message_start", () => {
	const mod = loadCardRunState();
	const initial = mod.createInitialState();
	const state = reduceAll(mod, [
		{ type: "message_start", message: { role: "user" } },
		{ type: "totally_unknown_event" },
		{ type: "message_update" },
	], initial);

	assert.equal(state, initial);
});

test("marks thinking done once the first output delta arrives", () => {
	const mod = loadCardRunState();
	const state = reduceAll(mod, [
		thinkingDelta("推理 A"),
		thinkingDelta("推理 B"),
		textDelta("答案"),
	]);

	assert.equal(state.reasoning.content, "推理 A推理 B");
	assert.equal(state.reasoning.active, false);
	const thinkingTrail = state.trail.filter((entry) => entry.text === "思考完成");
	assert.equal(thinkingTrail.length, 1, "只应有一条思考轨迹并被标记完成");
	assert.equal(thinkingTrail[0].status, "done");
	assert.ok(state.trail.some((entry) => entry.text === "开始输出" && entry.status === "running"));
});

test("keeps a single thinking trail entry across many thinking deltas", () => {
	const mod = loadCardRunState();
	const state = reduceAll(mod, [thinkingDelta("a"), thinkingDelta("b"), thinkingDelta("c")]);

	assert.equal(state.trail.filter((entry) => entry.text === "开始思考").length, 1);
	assert.equal(state.reasoning.active, true);
	assert.equal(state.footer, "thinking");
});

test("closes the streaming text block when a tool call starts", () => {
	const mod = loadCardRunState();
	const state = reduceAll(mod, [
		textDelta("before tool"),
		{
			type: "message_update",
			assistantMessageEvent: {
				type: "toolcall_start",
				toolCall: { id: "call_1", name: "read", input: { filePath: "src/main/index.ts" } },
			},
		},
	]);

	assert.equal(textBlocks(state)[0].streaming, false);
	assert.equal(state.footer, "tool_running");
	assert.deepEqual(toolBlocks(state).map((block) => [block.tool.id, block.tool.status]), [["call_1", "running"]]);
	const toolTrail = state.trail.find((entry) => entry.type === "tool");
	assert.equal(toolTrail.text, "工具调用: read");
	assert.equal(toolTrail.detail, "src/main/index.ts");
});

test("summarizes tool input only for known tools and truncates long values", () => {
	const mod = loadCardRunState();
	const longCommand = "echo ".repeat(40);
	const state = reduceAll(mod, [
		{ type: "tool_execution_start", toolName: "bash", args: { command: longCommand } },
		{ type: "tool_execution_start", toolName: "grep", args: { pattern: "needle" } },
		{ type: "tool_execution_start", toolName: "mystery", args: { whatever: "x" } },
	]);

	const details = state.trail.filter((entry) => entry.type === "tool").map((entry) => entry.detail);
	assert.equal(details[0].length, 81);
	assert.ok(details[0].endsWith("…"));
	assert.equal(details[1], "needle");
	assert.equal(details[2], undefined);
});

test("completes the newest running tool of the same name and rewrites its trail text", () => {
	const mod = loadCardRunState();
	const state = reduceAll(mod, [
		{ type: "tool_execution_start", toolName: "bash", args: { command: "ls" } },
		{ type: "tool_execution_end", toolName: "bash", isError: false },
	]);

	assert.equal(toolBlocks(state)[0].tool.status, "done");
	assert.equal(state.trail.at(-1).text, "工具完成: bash");
	assert.equal(state.trail.at(-1).status, "done");
});

test("marks a failing tool as error in blocks and trail", () => {
	const mod = loadCardRunState();
	const state = reduceAll(mod, [
		{
			type: "message_update",
			assistantMessageEvent: { type: "toolcall_start", toolCall: { id: "call_9", name: "write" } },
		},
		{
			type: "message_update",
			assistantMessageEvent: { type: "toolcall_end", toolCall: { id: "call_9", isError: true } },
		},
	]);

	assert.equal(toolBlocks(state)[0].tool.status, "error");
	assert.equal(state.trail.at(-1).text, "工具失败: write");
	assert.equal(state.trail.at(-1).status, "error");
});

test("ignores a tool_execution_end without a matching running tool", () => {
	const mod = loadCardRunState();
	const started = reduceAll(mod, [{ type: "tool_execution_start", toolName: "bash", args: {} }]);
	const finished = mod.reduceFromPiEvent(started, { type: "tool_execution_end", toolName: "bash" });
	const stray = mod.reduceFromPiEvent(finished, { type: "tool_execution_end", toolName: "bash" });

	assert.equal(stray, finished);
});

test("records compaction and auto retry attempts in the trail", () => {
	const mod = loadCardRunState();
	const state = reduceAll(mod, [
		{ type: "compaction_start", reason: "token 超限" },
		{ type: "auto_retry_start", attempt: 2, maxAttempts: 3 },
		{ type: "auto_retry_end", success: false },
	]);

	assert.equal(state.trail[0].text, "上下文压缩: token 超限");
	assert.equal(state.trail[1].text, "自动重试: 2/3");
	assert.equal(state.trail[1].status, "error");
});

test("falls back to placeholders for malformed compaction and retry payloads", () => {
	const mod = loadCardRunState();
	const state = reduceAll(mod, [
		{ type: "compaction_start" },
		{ type: "auto_retry_start" },
		{ type: "auto_retry_end", success: true },
	]);

	assert.equal(state.trail[0].text, "上下文压缩");
	assert.equal(state.trail[1].text, "自动重试: ?/?");
	assert.equal(state.trail[1].status, "done");
});

test("agent_end finalizes running trail entries and stamps duration", () => {
	const mod = loadCardRunState();
	const state = reduceAll(mod, [
		thinkingDelta("思考"),
		{ type: "tool_execution_start", toolName: "read", args: { filePath: "a.ts" } },
		{ type: "agent_end", stopReason: "end_turn" },
	]);

	assert.equal(state.terminal, "done");
	assert.equal(state.footer, null);
	assert.ok(state.trail.every((entry) => entry.status !== "running"));
	assert.equal(typeof state.meta.durationMs, "number");
	assert.ok(state.meta.durationMs >= 0);
});

test("agent_end with an error keeps the message and switches to the error terminal", () => {
	const mod = loadCardRunState();
	const state = reduceAll(mod, [
		textDelta("partial"),
		{ type: "agent_end", stopReason: "error", error: "connection reset" },
	]);

	assert.equal(state.terminal, "error");
	assert.equal(state.errorMsg, "connection reset");
	assert.equal(textBlocks(state)[0].streaming, false);
});

test("markInterrupted stops streaming without recording a duration", () => {
	const mod = loadCardRunState();
	const running = reduceAll(mod, [textDelta("half")]);
	const state = mod.markInterrupted(running);

	assert.equal(state.terminal, "interrupted");
	assert.equal(state.footer, null);
	assert.equal(state.meta.durationMs, undefined);
	assert.equal(textBlocks(state)[0].streaming, false);
});

test("reducers never mutate the input state", () => {
	const mod = loadCardRunState();
	const initial = mod.createInitialState();
	const snapshot = JSON.stringify(initial);
	mod.reduceFromPiEvent(initial, textDelta("x"));
	mod.reduceFromPiEvent(initial, thinkingDelta("y"));
	mod.markDone(initial);

	assert.equal(JSON.stringify(initial), snapshot);
});

test("assistant done event clears the footer without ending the run", () => {
	const mod = loadCardRunState();
	const state = reduceAll(mod, [
		textDelta("answer"),
		{ type: "message_update", assistantMessageEvent: { type: "done" } },
	]);

	assert.equal(state.footer, null);
	assert.equal(state.terminal, "running");
});

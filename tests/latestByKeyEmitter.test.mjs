import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";

function loadEmitter() {
	const { outputText } = ts.transpileModule(
		readFileSync("src/main/pi/LatestByKeyEmitter.ts", "utf8"),
		{ compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
	);
	const factory = vm.runInThisContext(`(function (exports) {\n${outputText}\n})`, {
		filename: "LatestByKeyEmitter.ts",
	});
	const exports = {};
	factory(exports);
	return exports.LatestByKeyEmitter;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test("emits only the latest value per key after the window elapses", async () => {
	const LatestByKeyEmitter = loadEmitter();
	const calls = [];
	const emitter = new LatestByKeyEmitter(20, (key, value) => calls.push([key, value]));

	emitter.push("a", 1);
	emitter.push("a", 2);
	emitter.push("a", 3);
	emitter.push("b", "x");
	assert.deepEqual(calls, [], "窗口期内不应该回调");

	await sleep(60);
	assert.deepEqual(calls, [["a", 3], ["b", "x"]]);
});

test("starts a new window after a key has been flushed", async () => {
	const LatestByKeyEmitter = loadEmitter();
	const calls = [];
	const emitter = new LatestByKeyEmitter(10, (key, value) => calls.push([key, value]));

	emitter.push("a", 1);
	await sleep(40);
	emitter.push("a", 2);
	await sleep(40);

	assert.deepEqual(calls, [["a", 1], ["a", 2]]);
});

test("manual flush delivers immediately and clears the pending timer", async () => {
	const LatestByKeyEmitter = loadEmitter();
	const calls = [];
	const emitter = new LatestByKeyEmitter(1000, (key, value) => calls.push([key, value]));

	emitter.push("a", "first");
	emitter.flush("a");
	assert.deepEqual(calls, [["a", "first"]]);

	// 已 flush 的 key 不应在原窗口到期时二次回调
	await sleep(30);
	assert.equal(calls.length, 1);
});

test("flush without a pending value is a no-op", () => {
	const LatestByKeyEmitter = loadEmitter();
	const calls = [];
	const emitter = new LatestByKeyEmitter(10, (key, value) => calls.push([key, value]));

	emitter.flush("missing");
	assert.deepEqual(calls, []);
});

test("cancel drops the pending value without emitting", async () => {
	const LatestByKeyEmitter = loadEmitter();
	const calls = [];
	const emitter = new LatestByKeyEmitter(10, (key, value) => calls.push([key, value]));

	emitter.push("a", 1);
	emitter.push("b", 2);
	emitter.cancel("a");
	await sleep(40);

	assert.deepEqual(calls, [["b", 2]]);
});

test("keys are tracked independently", async () => {
	const LatestByKeyEmitter = loadEmitter();
	const calls = [];
	const emitter = new LatestByKeyEmitter(20, (key, value) => calls.push([key, value]));

	emitter.push("a", 1);
	emitter.push("b", 1);
	emitter.flush("b");
	emitter.push("b", 2);
	await sleep(60);

	assert.deepEqual(calls, [["b", 1], ["a", 1], ["b", 2]]);
});

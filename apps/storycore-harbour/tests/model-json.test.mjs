import assert from "node:assert/strict";
import test from "node:test";

import { parseModelJson } from "../bundle/model-json.js";

test("parses one optional fenced JSON object", () => {
  assert.deepEqual(parseModelJson("```json\n{\"ok\":true}\n```"), { ok: true });
});

test("extracts one complete JSON object from surrounding prose", () => {
  assert.deepEqual(
    parseModelJson('Result follows: {"text":"brace } and \\\"quote\\\"","nested":{"ok":true}} End.'),
    { text: 'brace } and "quote"', nested: { ok: true } },
  );
});

test("rejects a truncated JSON object", () => {
  assert.throws(
    () => parseModelJson('Result: {"nested":{"ok":true}'),
    /Unexpected|complete JSON object/i,
  );
});

test("rejects ambiguous multiple JSON objects", () => {
  assert.throws(
    () => parseModelJson('{"first":true}\n{"second":true}'),
    /multiple JSON objects/i,
  );
});

test("rejects oversized model output before scanning", () => {
  assert.throws(() => parseModelJson("x".repeat(28_001)), /exceeded 28,000 characters/);
});

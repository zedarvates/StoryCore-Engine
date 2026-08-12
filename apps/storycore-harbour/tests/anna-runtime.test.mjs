import test from "node:test";
import assert from "node:assert/strict";
import { mountBundle, HostApiError } from "@anna-ai/cli/test";
import manifest from "../manifest.json" with { type: "json" };

function llmResult() {
  return {
    role: "assistant",
    content: { type: "text", text: "{\"ok\":true}" },
    model: "mock-harbour-model",
    stopReason: "endTurn",
    usage: { inputTokens: 4, outputTokens: 4, totalTokens: 8 },
  };
}

test("Anna harness allows the declared llm.complete capability", async () => {
  const harness = await mountBundle({
    manifest,
    mocks: {
      "llm.complete": () => llmResult(),
    },
  });

  const response = await harness.runtime.llm.complete({
    messages: [
      { role: "user", content: { type: "text", text: "Return JSON." } },
    ],
  });

  assert.deepEqual(response, llmResult());
  assert.equal(harness.calls.lastOf("llm.complete")?.outcome, "ok");
});

test("Anna harness provides isolated in-memory App storage", async () => {
  const harness = await mountBundle({ manifest });
  const value = { schemaVersion: "storycore-harbour.project.v1", project: { id: "runtime-test" } };

  await harness.runtime.storage.set({
    key: "projects/current",
    value,
  });

  const loaded = await harness.runtime.storage.get({ key: "projects/current" });
  assert.equal(loaded.exists, true);
  assert.deepEqual(loaded.value, value);
  assert.equal(harness.calls.byNs("storage").length, 2);
  assert.equal(harness.calls.lastOf("storage.get")?.outcome, "ok");
});

test("Anna harness rejects Host API namespaces absent from the manifest", async () => {
  const harness = await mountBundle({ manifest });

  await assert.rejects(
    () => harness.runtime.call("tools", "invoke", { tool_id: "not-declared", method: "run", args: {} }),
    HostApiError,
  );

  assert.equal(harness.calls.last()?.outcome, "denied");
});

test("Anna harness records the declared window title call", async () => {
  const harness = await mountBundle({ manifest });

  await harness.runtime.window.set_title({ title: "StoryCore Harbour" });

  const call = harness.calls.lastOf("window.set_title");
  assert.equal(call?.outcome, "ok");
  assert.match(JSON.stringify(call?.args), /StoryCore Harbour/);
});

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

test("Anna harness accepts the declared storage get/set shapes", async () => {
  const value = {
    schemaVersion: "storycore-harbour.project.v1",
    project: { id: "runtime-test" },
  };
  const etag = 'W/"runtime-test"';
  const harness = await mountBundle({
    manifest,
    mocks: {
      "storage.set": () => ({ etag, generation: 1 }),
      "storage.get": () => ({
        exists: true,
        value,
        etag,
        generation: 1,
      }),
    },
  });

  const created = await harness.runtime.storage.set({
    key: "projects/current",
    value,
  });
  const loaded = await harness.runtime.storage.get({ key: "projects/current" });

  assert.equal(created.etag, etag);
  assert.equal(loaded.exists, true);
  assert.deepEqual(loaded.value, value);
  assert.equal(loaded.etag, etag);
  assert.equal(harness.calls.byNs("storage").length, 2);
  assert.equal(harness.calls.lastOf("storage.get")?.outcome, "ok");
});

test("Anna harness accepts paginated project listing and ETag deletion", async () => {
  const etag = 'W/"snapshot-1"';
  const harness = await mountBundle({
    manifest,
    mocks: {
      "storage.list": () => ({
        items: [
          {
            key: "projects/by-id/project-1",
            etag,
            generation: 7,
            kind: "kv",
            updated_at: "2026-08-12T12:00:00.000Z",
          },
        ],
        next_cursor: null,
      }),
      "storage.delete": () => ({ deleted: true }),
    },
  });

  const listed = await harness.runtime.storage.list({
    prefix: "projects/",
    limit: 100,
    kind: "kv",
  });
  const deleted = await harness.runtime.storage.delete({
    key: listed.items[0].key,
    if_match: listed.items[0].etag,
  });

  assert.equal(listed.items.length, 1);
  assert.equal(listed.items[0].key, "projects/by-id/project-1");
  assert.equal(listed.items[0].etag, etag);
  assert.equal(listed.next_cursor, null);
  assert.equal(deleted.deleted, true);
  assert.equal(harness.calls.lastOf("storage.list")?.outcome, "ok");
  assert.equal(harness.calls.lastOf("storage.delete")?.outcome, "ok");
  assert.match(JSON.stringify(harness.calls.lastOf("storage.delete")?.args), /snapshot-1/);
});

test("Anna harness rejects Host API namespaces absent from the manifest", async () => {
  const harness = await mountBundle({ manifest });

  await assert.rejects(
    () => harness.runtime.call("tools", "invoke", {
      tool_id: "not-declared",
      method: "run",
      args: {},
    }),
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

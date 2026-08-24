import assert from "node:assert/strict";
import test from "node:test";

test("repair rebuilds from the exact user input without carrying truncated model output", async () => {
  let createRepairPrompt;
  await assert.doesNotReject(async () => {
    ({ createRepairPrompt } = await import("../bundle/repair-prompt.js"));
  }, "The repair prompt builder must be available to the real App.");

  const input = {
    idea: "UNIQUE SOURCE IDEA that must survive the repair request exactly.",
    title: "Exact working title",
    format: "documentary",
    durationMinutes: 8,
    language: "en",
    tone: "Measured and observational",
    audience: "General audience",
  };
  const prompt = createRepairPrompt(input, ["JSON parse failed: truncated object"]);
  const request = JSON.parse(prompt);

  assert.deepEqual(request.input, input);
  assert.deepEqual(request.validationErrors, ["JSON parse failed: truncated object"]);
  assert.equal(request.task, "Rebuild a complete StoryCore Harbour production package from the source input.");
  assert.equal(Object.hasOwn(request, "previousResponse"), false);
  assert.equal(prompt.includes("PREVIOUS RESPONSE"), false);
});

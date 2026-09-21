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
  assert.match(request.task, /Rebuild the complete StoryCore Harbour project/);
  assert.equal(Object.hasOwn(request, "previousResponse"), false);
  assert.equal(prompt.includes("PREVIOUS RESPONSE"), false);
});

test("repair prompt carries a complete structural checklist without weakening the contract", async () => {
  const { createRepairPrompt } = await import("../bundle/repair-prompt.js");
  const request = JSON.parse(createRepairPrompt({
    idea: "A sufficiently long fictional source idea for a repair test.",
    title: "Repair shape",
    format: "short-film",
    durationMinutes: 3,
    language: "en",
    tone: "Clear",
    audience: "General audience",
  }, ["continuityReport.score must be between 0 and 100."]));

  assert.equal(request.requiredShape.schemaVersion, "storycore-harbour.project.v1");
  assert.ok(request.requiredShape.project.includes("sourceIdea"));
  assert.ok(request.requiredShape.productionBible.includes("visualDirection.cameraLanguage"));
  assert.ok(request.requiredShape.shot.includes("dialogue"));
  assert.ok(request.requiredShape.shot.includes("sound"));
  assert.deepEqual(request.requiredShape.continuityReport, ["score", "warnings[]", "checkedAt"]);
  assert.ok(request.hardRules.some((rule) => /exactly 3 scenes/i.test(rule)));
  assert.ok(request.hardRules.some((rule) => /dialogue and sound are always strings/i.test(rule)));
  assert.ok(request.hardRules.some((rule) => /warning severity is only info, warning, or error/i.test(rule)));
  assert.equal(request.discardPreviousResponse, true);
  assert.equal(request.sizeBudget.maxCharacters, 12_000);
});

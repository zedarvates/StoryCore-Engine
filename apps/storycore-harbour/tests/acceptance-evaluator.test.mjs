import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  evaluateAcceptance,
  parseResultsJsonl,
  validateAcceptanceCorpus,
} from "../scripts/evaluate-acceptance.mjs";

const corpus = JSON.parse(
  await readFile(new URL("../acceptance/prompts.json", import.meta.url), "utf8")
);
const sample = JSON.parse(
  await readFile(new URL("../examples/sample-project.json", import.meta.url), "utf8")
);

function projectFor(prompt) {
  const project = structuredClone(sample);
  const now = "2026-08-12T12:00:00.000Z";
  project.project = {
    ...project.project,
    id: `project-${prompt.id.toLowerCase()}`,
    title: prompt.input.title || `Generated ${prompt.id}`,
    language: prompt.input.language,
    format: prompt.input.format,
    durationMinutes: prompt.input.durationMinutes,
    audience: prompt.input.audience,
    tone: prompt.input.tone,
    sourceIdea: prompt.input.idea,
    createdAt: now,
    updatedAt: now,
  };
  const totalSeconds = Number(prompt.input.durationMinutes) * 60;
  const each = totalSeconds / project.scenes.length;
  project.scenes.forEach((scene) => {
    scene.durationSeconds = each;
  });
  project.continuityReport.checkedAt = now;
  return project;
}

function successfulResults(durationMs = 1000) {
  return corpus.prompts.map((prompt) => ({
    promptId: prompt.id,
    durationMs,
    repairUsed: false,
    project: projectFor(prompt),
  }));
}

test("the immutable acceptance corpus is valid", () => {
  assert.deepEqual(validateAcceptanceCorpus(corpus), []);
});

test("twenty valid results pass the acceptance gate", () => {
  const summary = evaluateAcceptance(corpus, successfulResults());
  assert.equal(summary.gatePassed, true);
  assert.equal(summary.passCount, 20);
  assert.equal(summary.failures.length, 0);
  assert.equal(summary.medianDurationMs, 1000);
});

test("the target permits two explicit run failures", () => {
  const results = successfulResults();
  for (const index of [0, 1]) {
    delete results[index].project;
    results[index].error = { category: "provider", name: "APP_PROVIDER_ERROR" };
  }
  const summary = evaluateAcceptance(corpus, results);
  assert.equal(summary.gatePassed, true);
  assert.equal(summary.passCount, 18);
  assert.equal(summary.failures.length, 2);
});

test("three run failures fail the 18 of 20 gate", () => {
  const results = successfulResults();
  for (const index of [0, 1, 2]) {
    delete results[index].project;
    results[index].error = { category: "timeout", name: "timeout" };
  }
  const summary = evaluateAcceptance(corpus, results);
  assert.equal(summary.gatePassed, false);
  assert.equal(summary.passCount, 17);
});

test("duplicate or unknown results are structural failures", () => {
  const results = successfulResults();
  results.push(structuredClone(results[0]));
  results.push({ promptId: "HBR-UNKNOWN", durationMs: 100, project: projectFor(corpus.prompts[0]) });
  const summary = evaluateAcceptance(corpus, results);
  assert.equal(summary.gatePassed, false);
  assert.equal(summary.structuralFailureCount, 2);
});

test("an invalid project is reported as a contract failure", () => {
  const results = successfulResults();
  results[0].project.scenes[0].locationId = "missing-location";
  const summary = evaluateAcceptance(corpus, results);
  assert.equal(summary.passCount, 19);
  assert.equal(summary.failures.find((item) => item.promptId === "HBR-A01")?.category, "contract");
});

test("acceptance results must preserve user input", () => {
  const results = successfulResults();
  results[0].project.project.title = "Model replaced the title";
  const summary = evaluateAcceptance(corpus, results);
  assert.equal(summary.passCount, 19);
  assert.equal(summary.failures.find((item) => item.promptId === "HBR-A01")?.category, "input-mismatch");
});

test("median duration above the mission limit fails the gate", () => {
  const summary = evaluateAcceptance(corpus, successfulResults(180001));
  assert.equal(summary.passCount, 20);
  assert.equal(summary.gatePassed, false);
});

test("JSONL parsing reports malformed lines without exposing content", () => {
  const parsed = parseResultsJsonl('{"promptId":"HBR-A01"}\nnot-json\n');
  assert.equal(parsed.entries.length, 1);
  assert.equal(parsed.errors.length, 1);
  assert.match(parsed.errors[0], /line 2/i);
});

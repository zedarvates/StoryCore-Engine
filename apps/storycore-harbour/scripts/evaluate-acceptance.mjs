#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { SUPPORTED_FORMATS, validateProject } from "../bundle/project-contract.js";

const ACCEPTANCE_SCHEMA = "storycore-harbour.acceptance.v1";
const RESULT_CATEGORIES = new Set([
  "runtime",
  "permission",
  "quota",
  "provider",
  "timeout",
  "parse",
  "contract",
  "storage",
  "unknown",
]);

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isText = (value, min = 1, max = Number.POSITIVE_INFINITY) =>
  typeof value === "string" && value.trim().length >= min && value.length <= max;

function percentile(values, ratio) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index];
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[midpoint];
  return (sorted[midpoint - 1] + sorted[midpoint]) / 2;
}

export function validateAcceptanceCorpus(corpus) {
  const errors = [];
  if (!isObject(corpus)) return ["Acceptance corpus must be a JSON object."];
  if (corpus.schemaVersion !== ACCEPTANCE_SCHEMA) {
    errors.push(`schemaVersion must be ${ACCEPTANCE_SCHEMA}.`);
  }
  if (!Array.isArray(corpus.prompts)) return [...errors, "prompts must be an array."];
  if (corpus.prompts.length !== 20) errors.push("The immutable acceptance corpus must contain exactly 20 prompts.");
  if (!Number.isInteger(corpus.targetPasses) || corpus.targetPasses < 1 || corpus.targetPasses > corpus.prompts.length) {
    errors.push("targetPasses must be an integer between 1 and the prompt count.");
  }
  if (!Number.isFinite(Number(corpus.maxMedianDurationMs)) || Number(corpus.maxMedianDurationMs) <= 0) {
    errors.push("maxMedianDurationMs must be a positive number.");
  }

  const ids = new Set();
  const formats = new Set();
  const languages = new Map();
  for (const [index, item] of corpus.prompts.entries()) {
    const path = `prompts[${index}]`;
    if (!isObject(item)) {
      errors.push(`${path} must be an object.`);
      continue;
    }
    if (!/^HBR-A\d{2}$/.test(item.id || "")) errors.push(`${path}.id must match HBR-A00.`);
    if (ids.has(item.id)) errors.push(`Duplicate acceptance prompt id: ${item.id}.`);
    ids.add(item.id);

    const input = item.input;
    if (!isObject(input)) {
      errors.push(`${path}.input must be an object.`);
      continue;
    }
    if (typeof input.title !== "string" || input.title.length > 160) {
      errors.push(`${path}.input.title must be a string of at most 160 characters.`);
    }
    if (!SUPPORTED_FORMATS.has(input.format)) errors.push(`${path}.input.format is unsupported: ${input.format}.`);
    formats.add(input.format);
    if (!Number.isFinite(Number(input.durationMinutes)) || Number(input.durationMinutes) < 0.25 || Number(input.durationMinutes) > 240) {
      errors.push(`${path}.input.durationMinutes must be between 0.25 and 240.`);
    }
    if (!new Set(["en", "fr"]).has(input.language)) errors.push(`${path}.input.language must be en or fr.`);
    languages.set(input.language, (languages.get(input.language) || 0) + 1);
    if (!isText(input.tone, 1, 240)) errors.push(`${path}.input.tone must contain 1-240 characters.`);
    if (!isText(input.audience, 1, 240)) errors.push(`${path}.input.audience must contain 1-240 characters.`);
    if (!isText(input.idea, 20, 12000)) errors.push(`${path}.input.idea must contain 20-12000 characters.`);
    if (!Array.isArray(item.coverage) || item.coverage.length === 0 || item.coverage.some((tag) => !isText(tag))) {
      errors.push(`${path}.coverage must be a non-empty array of strings.`);
    }
  }

  for (const format of SUPPORTED_FORMATS) {
    if (!formats.has(format)) errors.push(`Acceptance corpus does not cover format ${format}.`);
  }
  if ((languages.get("en") || 0) < 10 || (languages.get("fr") || 0) < 10) {
    errors.push("Acceptance corpus must contain at least ten English and ten French prompts.");
  }
  return [...new Set(errors)];
}

export function parseResultsJsonl(source) {
  const entries = [];
  const errors = [];
  for (const [index, raw] of String(source).split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line) continue;
    try {
      entries.push(JSON.parse(line));
    } catch (error) {
      errors.push(`Results line ${index + 1} is invalid JSON: ${error.message}`);
    }
  }
  return { entries, errors };
}

function compareProjectInput(project, prompt) {
  const errors = [];
  const identity = project.project || {};
  const input = prompt.input;
  const exactFields = ["language", "format", "audience", "tone"];
  for (const field of exactFields) {
    if (identity[field] !== input[field]) errors.push(`project.${field} does not preserve the acceptance input.`);
  }
  if (Number(identity.durationMinutes) !== Number(input.durationMinutes)) {
    errors.push("project.durationMinutes does not preserve the acceptance input.");
  }
  if (identity.sourceIdea !== input.idea) errors.push("project.sourceIdea does not preserve the acceptance input.");
  if (input.title && identity.title !== input.title) errors.push("project.title does not preserve the supplied working title.");
  return errors;
}

export function evaluateAcceptance(corpus, entries) {
  const corpusErrors = validateAcceptanceCorpus(corpus);
  if (corpusErrors.length) {
    return {
      gatePassed: false,
      corpusErrors,
      promptCount: Array.isArray(corpus?.prompts) ? corpus.prompts.length : 0,
      passCount: 0,
      failures: [],
      medianDurationMs: null,
      p95DurationMs: null,
      repairCount: 0,
    };
  }

  const failures = [];
  const structuralFailures = [];
  const resultByPrompt = new Map();
  for (const [index, entry] of entries.entries()) {
    if (!isObject(entry)) {
      structuralFailures.push({ promptId: `result-line-${index + 1}`, category: "unknown", reasons: ["Result must be an object."] });
      continue;
    }
    if (!isText(entry.promptId)) {
      structuralFailures.push({ promptId: `result-line-${index + 1}`, category: "unknown", reasons: ["Result promptId is required."] });
      continue;
    }
    if (resultByPrompt.has(entry.promptId)) {
      structuralFailures.push({ promptId: entry.promptId, category: "unknown", reasons: ["Duplicate result for prompt."] });
      continue;
    }
    resultByPrompt.set(entry.promptId, entry);
  }

  const promptIds = new Set(corpus.prompts.map((prompt) => prompt.id));
  for (const id of resultByPrompt.keys()) {
    if (!promptIds.has(id)) structuralFailures.push({ promptId: id, category: "unknown", reasons: ["Result references an unknown prompt."] });
  }

  let passCount = 0;
  let repairCount = 0;
  const successfulDurations = [];

  for (const prompt of corpus.prompts) {
    const entry = resultByPrompt.get(prompt.id);
    if (!entry) {
      failures.push({ promptId: prompt.id, category: "missing", reasons: ["No result was recorded."] });
      continue;
    }

    const durationMs = Number(entry.durationMs);
    if (!Number.isFinite(durationMs) || durationMs < 0) {
      failures.push({ promptId: prompt.id, category: "unknown", reasons: ["durationMs must be a non-negative number."] });
      continue;
    }
    if (entry.repairUsed === true) repairCount += 1;

    if (entry.error) {
      const category = RESULT_CATEGORIES.has(entry.error.category) ? entry.error.category : "unknown";
      failures.push({ promptId: prompt.id, category, reasons: [isText(entry.error.name) ? entry.error.name : "Run failed."] });
      continue;
    }

    const projectErrors = validateProject(entry.project);
    const inputErrors = projectErrors.length ? [] : compareProjectInput(entry.project, prompt);
    const reasons = [...projectErrors, ...inputErrors];
    if (reasons.length) {
      failures.push({ promptId: prompt.id, category: projectErrors.length ? "contract" : "input-mismatch", reasons });
      continue;
    }

    passCount += 1;
    successfulDurations.push(durationMs);
  }

  failures.unshift(...structuralFailures);

  const medianDurationMs = median(successfulDurations);
  const p95DurationMs = percentile(successfulDurations, 0.95);
  const passGate = passCount >= corpus.targetPasses;
  const latencyGate = medianDurationMs !== null && medianDurationMs <= Number(corpus.maxMedianDurationMs);

  return {
    gatePassed: corpusErrors.length === 0 && structuralFailures.length === 0 && passGate && latencyGate,
    corpusErrors,
    promptCount: corpus.prompts.length,
    passCount,
    targetPasses: corpus.targetPasses,
    failures,
    medianDurationMs,
    p95DurationMs,
    maxMedianDurationMs: Number(corpus.maxMedianDurationMs),
    repairCount,
    structuralFailureCount: structuralFailures.length,
  };
}

function formatDuration(ms) {
  if (ms === null) return "n/a";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function printHuman(summary) {
  if (summary.corpusErrors.length) {
    console.error(`Acceptance corpus invalid (${summary.corpusErrors.length}):`);
    for (const error of summary.corpusErrors) console.error(`- ${error}`);
    return;
  }
  console.log(`StoryCore Harbour acceptance: ${summary.passCount}/${summary.promptCount} passed (target ${summary.targetPasses}).`);
  console.log(`Median: ${formatDuration(summary.medianDurationMs)} · p95: ${formatDuration(summary.p95DurationMs)} · repairs: ${summary.repairCount}.`);
  if (summary.failures.length) {
    console.log("Failures:");
    for (const failure of summary.failures) {
      console.log(`- ${failure.promptId} [${failure.category}]: ${failure.reasons.join(" ")}`);
    }
  }
  console.log(summary.gatePassed ? "Acceptance gate: PASS" : "Acceptance gate: FAIL");
}

async function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes("--json");
  const corpusOnly = args.includes("--corpus-only");
  const positional = args.filter((arg) => !arg.startsWith("--"));
  const corpusPath = positional[0] || "acceptance/prompts.json";
  const resultsPath = positional[1] || "acceptance/results.local.jsonl";

  try {
    const corpus = JSON.parse(await readFile(corpusPath, "utf8"));
    const corpusErrors = validateAcceptanceCorpus(corpus);
    if (corpusOnly) {
      const summary = {
        gatePassed: corpusErrors.length === 0,
        corpusErrors,
        promptCount: Array.isArray(corpus.prompts) ? corpus.prompts.length : 0,
      };
      if (jsonMode) console.log(JSON.stringify(summary, null, 2));
      else if (corpusErrors.length) {
        console.error(`Acceptance corpus invalid (${corpusErrors.length}):`);
        for (const error of corpusErrors) console.error(`- ${error}`);
      } else {
        console.log(`Valid immutable acceptance corpus: ${summary.promptCount} prompts.`);
      }
      if (!summary.gatePassed) process.exitCode = 1;
      return;
    }

    const { entries, errors: parseErrors } = parseResultsJsonl(await readFile(resultsPath, "utf8"));
    const summary = evaluateAcceptance(corpus, entries);
    if (parseErrors.length) {
      summary.gatePassed = false;
      summary.failures.unshift(...parseErrors.map((reason, index) => ({
        promptId: `parse-${index + 1}`,
        category: "parse",
        reasons: [reason],
      })));
    }
    if (jsonMode) console.log(JSON.stringify(summary, null, 2));
    else printHuman(summary);
    if (!summary.gatePassed) process.exitCode = 1;
  } catch (error) {
    console.error(`Acceptance evaluation failed: ${error.message}`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  await main();
}

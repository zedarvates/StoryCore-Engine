#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { SUPPORTED_FORMATS, validateProject } from "../bundle/project-contract.js";
import { resolveExistingAppFile, safeFileErrorCode } from "./safe-path.mjs";

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
const PUBLIC_CATEGORIES = new Set([
  ...RESULT_CATEGORIES,
  "missing",
  "input-mismatch",
]);
const SUPPORTED_LANGUAGES = new Set(["en", "fr"]);
const CANONICAL_PROMPT_IDS = Object.freeze(
  Array.from({ length: 20 }, (_, index) => `HBR-A${String(index + 1).padStart(2, "0")}`),
);

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isText = (value, min = 1, max = Number.POSITIVE_INFINITY) =>
  typeof value === "string" && value.trim().length >= min && value.length <= max;
const compareText = (left, right) => left.localeCompare(right);

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

function validateCorpusHeader(corpus, errors) {
  if (corpus.schemaVersion !== ACCEPTANCE_SCHEMA) {
    errors.push(`schemaVersion must be ${ACCEPTANCE_SCHEMA}.`);
  }
  if (corpus.prompts.length !== CANONICAL_PROMPT_IDS.length) {
    errors.push(`The immutable acceptance corpus must contain exactly ${CANONICAL_PROMPT_IDS.length} prompts.`);
  }
  if (
    !Number.isInteger(corpus.targetPasses) ||
    corpus.targetPasses < 1 ||
    corpus.targetPasses > corpus.prompts.length
  ) {
    errors.push("targetPasses must be an integer between 1 and the prompt count.");
  }
  if (
    !Number.isFinite(Number(corpus.maxMedianDurationMs)) ||
    Number(corpus.maxMedianDurationMs) <= 0
  ) {
    errors.push("maxMedianDurationMs must be a positive number.");
  }
}

function validatePromptInput(input, path, formats, languages, errors) {
  if (!isObject(input)) {
    errors.push(`${path}.input must be an object.`);
    return;
  }
  if (typeof input.title !== "string" || input.title.length > 160) {
    errors.push(`${path}.input.title must be a string of at most 160 characters.`);
  }
  if (!SUPPORTED_FORMATS.has(input.format)) {
    errors.push(`${path}.input.format is unsupported.`);
  } else {
    formats.add(input.format);
  }
  const duration = Number(input.durationMinutes);
  if (!Number.isFinite(duration) || duration < 0.25 || duration > 240) {
    errors.push(`${path}.input.durationMinutes must be between 0.25 and 240.`);
  }
  if (!SUPPORTED_LANGUAGES.has(input.language)) {
    errors.push(`${path}.input.language must be en or fr.`);
  } else {
    languages.set(input.language, (languages.get(input.language) || 0) + 1);
  }
  if (!isText(input.tone, 1, 240)) {
    errors.push(`${path}.input.tone must contain 1-240 characters.`);
  }
  if (!isText(input.audience, 1, 240)) {
    errors.push(`${path}.input.audience must contain 1-240 characters.`);
  }
  if (!isText(input.idea, 20, 12_000)) {
    errors.push(`${path}.input.idea must contain 20-12000 characters.`);
  }
}

function validatePromptItem(item, index, state, errors) {
  const path = `prompts[${index}]`;
  if (!isObject(item)) {
    errors.push(`${path} must be an object.`);
    return;
  }

  const expectedId = CANONICAL_PROMPT_IDS[index];
  if (item.id !== expectedId) {
    errors.push(`${path}.id must be ${expectedId}.`);
  }
  if (state.ids.has(item.id)) {
    errors.push(`Duplicate acceptance prompt id at ${path}.`);
  }
  state.ids.add(item.id);

  validatePromptInput(item.input, path, state.formats, state.languages, errors);
  if (
    !Array.isArray(item.coverage) ||
    item.coverage.length === 0 ||
    item.coverage.some((tag) => !isText(tag))
  ) {
    errors.push(`${path}.coverage must be a non-empty array of strings.`);
  }
}

function validateCorpusCoverage(state, errors) {
  for (const format of SUPPORTED_FORMATS) {
    if (!state.formats.has(format)) {
      errors.push(`Acceptance corpus does not cover required format ${format}.`);
    }
  }
  if ((state.languages.get("en") || 0) < 10 || (state.languages.get("fr") || 0) < 10) {
    errors.push("Acceptance corpus must contain at least ten English and ten French prompts.");
  }
}

export function validateAcceptanceCorpus(corpus) {
  if (!isObject(corpus)) return ["Acceptance corpus must be a JSON object."];
  if (!Array.isArray(corpus.prompts)) return ["prompts must be an array."];

  const errors = [];
  const state = {
    ids: new Set(),
    formats: new Set(),
    languages: new Map(),
  };

  validateCorpusHeader(corpus, errors);
  corpus.prompts.forEach((item, index) => validatePromptItem(item, index, state, errors));
  validateCorpusCoverage(state, errors);
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
    } catch {
      errors.push(`Results line ${index + 1} is invalid JSON.`);
    }
  }
  return { entries, errors };
}

function compareProjectInput(project, prompt) {
  const errors = [];
  const identity = project.project || {};
  const input = prompt.input;
  for (const field of ["language", "format", "audience", "tone"]) {
    if (identity[field] !== input[field]) {
      errors.push(`project.${field} does not preserve the acceptance input.`);
    }
  }
  if (Number(identity.durationMinutes) !== Number(input.durationMinutes)) {
    errors.push("project.durationMinutes does not preserve the acceptance input.");
  }
  if (identity.sourceIdea !== input.idea) {
    errors.push("project.sourceIdea does not preserve the acceptance input.");
  }
  if (input.title && identity.title !== input.title) {
    errors.push("project.title does not preserve the supplied working title.");
  }
  return errors;
}

function makeFailure(promptId, category, reasons) {
  return { promptId, category, reasons };
}

function indexResultEntries(entries) {
  const resultByPrompt = new Map();
  const structuralFailures = [];

  entries.forEach((entry, index) => {
    const lineId = `result-line-${index + 1}`;
    if (!isObject(entry)) {
      structuralFailures.push(makeFailure(lineId, "unknown", ["Result must be an object."]));
      return;
    }
    if (!isText(entry.promptId)) {
      structuralFailures.push(makeFailure(lineId, "unknown", ["Result promptId is required."]));
      return;
    }
    if (resultByPrompt.has(entry.promptId)) {
      structuralFailures.push(makeFailure(entry.promptId, "unknown", ["Duplicate result for prompt."]));
      return;
    }
    resultByPrompt.set(entry.promptId, entry);
  });

  return { resultByPrompt, structuralFailures };
}

function findUnknownPromptResults(resultByPrompt) {
  const failures = [];
  for (const id of resultByPrompt.keys()) {
    if (!CANONICAL_PROMPT_IDS.includes(id)) {
      failures.push(makeFailure(id, "unknown", ["Result references an unknown prompt."]));
    }
  }
  return failures;
}

function evaluatePromptResult(prompt, entry, statistics) {
  if (!entry) {
    statistics.failures.push(makeFailure(prompt.id, "missing", ["No result was recorded."]));
    return;
  }

  const durationMs = Number(entry.durationMs);
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    statistics.failures.push(
      makeFailure(prompt.id, "unknown", ["durationMs must be a non-negative number."]),
    );
    return;
  }

  if (entry.repairUsed === true) statistics.repairCount += 1;
  if (entry.error) {
    const category = RESULT_CATEGORIES.has(entry.error.category) ? entry.error.category : "unknown";
    const reason = isText(entry.error.name) ? entry.error.name : "Run failed.";
    statistics.failures.push(makeFailure(prompt.id, category, [reason]));
    return;
  }

  const projectErrors = validateProject(entry.project);
  const inputErrors = projectErrors.length ? [] : compareProjectInput(entry.project, prompt);
  const reasons = [...projectErrors, ...inputErrors];
  if (reasons.length) {
    const category = projectErrors.length ? "contract" : "input-mismatch";
    statistics.failures.push(makeFailure(prompt.id, category, reasons));
    return;
  }

  statistics.passCount += 1;
  statistics.successfulDurations.push(durationMs);
}

function invalidCorpusSummary(corpus, corpusErrors) {
  return {
    gatePassed: false,
    corpusErrors,
    promptCount: Array.isArray(corpus?.prompts) ? corpus.prompts.length : 0,
    passCount: 0,
    failures: [],
    medianDurationMs: null,
    p95DurationMs: null,
    repairCount: 0,
    structuralFailureCount: 0,
  };
}

export function evaluateAcceptance(corpus, entries) {
  const corpusErrors = validateAcceptanceCorpus(corpus);
  if (corpusErrors.length) return invalidCorpusSummary(corpus, corpusErrors);

  const { resultByPrompt, structuralFailures } = indexResultEntries(entries);
  structuralFailures.push(...findUnknownPromptResults(resultByPrompt));

  const statistics = {
    passCount: 0,
    repairCount: 0,
    failures: [],
    successfulDurations: [],
  };
  corpus.prompts.forEach((prompt) => {
    evaluatePromptResult(prompt, resultByPrompt.get(prompt.id), statistics);
  });
  statistics.failures.unshift(...structuralFailures);

  const medianDurationMs = median(statistics.successfulDurations);
  const p95DurationMs = percentile(statistics.successfulDurations, 0.95);
  const passGate = statistics.passCount >= corpus.targetPasses;
  const latencyGate =
    medianDurationMs !== null && medianDurationMs <= Number(corpus.maxMedianDurationMs);

  return {
    gatePassed: structuralFailures.length === 0 && passGate && latencyGate,
    corpusErrors,
    promptCount: corpus.prompts.length,
    passCount: statistics.passCount,
    targetPasses: corpus.targetPasses,
    failures: statistics.failures,
    medianDurationMs,
    p95DurationMs,
    maxMedianDurationMs: Number(corpus.maxMedianDurationMs),
    repairCount: statistics.repairCount,
    structuralFailureCount: structuralFailures.length,
  };
}

function publicPromptId(value) {
  const index = CANONICAL_PROMPT_IDS.indexOf(value);
  if (index >= 0) return CANONICAL_PROMPT_IDS[index];
  if (/^result-line-\d+$/.test(value)) return "malformed-result";
  if (/^parse-\d+$/.test(value)) return "malformed-jsonl";
  return "unknown-result";
}

function publicCategory(value) {
  return PUBLIC_CATEGORIES.has(value) ? value : "unknown";
}

function failureCategoryCounts(failures) {
  const counts = Object.fromEntries(
    [...PUBLIC_CATEGORIES].sort(compareText).map((category) => [category, 0]),
  );
  for (const failure of failures) {
    counts[publicCategory(failure.category)] += 1;
  }
  return counts;
}

export function toPublicSummary(summary) {
  const failures = Array.isArray(summary.failures) ? summary.failures : [];
  return {
    gatePassed: summary.gatePassed === true,
    corpusErrorCount: Array.isArray(summary.corpusErrors) ? summary.corpusErrors.length : 0,
    promptCount: Number(summary.promptCount) || 0,
    passCount: Number(summary.passCount) || 0,
    targetPasses: Number(summary.targetPasses) || 0,
    failureCount: failures.length,
    failures: failures.map((failure) => ({
      promptId: publicPromptId(failure.promptId),
      category: publicCategory(failure.category),
      reasonCount: Array.isArray(failure.reasons) ? failure.reasons.length : 0,
    })),
    failureCategoryCounts: failureCategoryCounts(failures),
    medianDurationMs: Number.isFinite(summary.medianDurationMs) ? summary.medianDurationMs : null,
    p95DurationMs: Number.isFinite(summary.p95DurationMs) ? summary.p95DurationMs : null,
    maxMedianDurationMs: Number.isFinite(summary.maxMedianDurationMs)
      ? summary.maxMedianDurationMs
      : null,
    repairCount: Number(summary.repairCount) || 0,
    structuralFailureCount: Number(summary.structuralFailureCount) || 0,
  };
}

function formatDuration(ms) {
  if (ms === null) return "n/a";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function printHuman(summary) {
  const report = toPublicSummary(summary);
  if (report.corpusErrorCount) {
    console.error(`Acceptance corpus invalid (${report.corpusErrorCount} validation failures).`);
    return;
  }

  console.log(
    `StoryCore Harbour acceptance: ${report.passCount}/${report.promptCount} passed ` +
      `(target ${report.targetPasses}).`,
  );
  console.log(
    `Median: ${formatDuration(report.medianDurationMs)} · ` +
      `p95: ${formatDuration(report.p95DurationMs)} · repairs: ${report.repairCount}.`,
  );
  if (report.failures.length) {
    console.log("Failures (privacy-safe identifiers only):");
    for (const failure of report.failures) {
      console.log(
        `- ${failure.promptId} [${failure.category}] (${failure.reasonCount} validation reasons)`,
      );
    }
  }
  console.log(report.gatePassed ? "Acceptance gate: PASS" : "Acceptance gate: FAIL");
}

function parseCliArguments(argv) {
  const jsonMode = argv.includes("--json");
  const corpusOnly = argv.includes("--corpus-only");
  const positional = argv.filter((argument) => !argument.startsWith("--"));
  return {
    jsonMode,
    corpusOnly,
    corpusPath: positional[0] || "acceptance/prompts.json",
    resultsPath: positional[1] || "acceptance/results.local.jsonl",
  };
}

function printCorpusOnly(corpus, corpusErrors, jsonMode) {
  const report = {
    gatePassed: corpusErrors.length === 0,
    corpusErrorCount: corpusErrors.length,
    promptCount: Array.isArray(corpus.prompts) ? corpus.prompts.length : 0,
  };
  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
  } else if (report.corpusErrorCount) {
    console.error(`Acceptance corpus invalid (${report.corpusErrorCount} validation failures).`);
  } else {
    console.log(`Valid immutable acceptance corpus: ${report.promptCount} prompts.`);
  }
  if (!report.gatePassed) process.exitCode = 1;
}

function addParseFailures(summary, parseErrors) {
  if (!parseErrors.length) return summary;
  summary.gatePassed = false;
  const failures = parseErrors.map((_, index) =>
    makeFailure(`parse-${index + 1}`, "parse", ["Invalid JSONL result line."]),
  );
  summary.failures.unshift(...failures);
  return summary;
}

async function readJsonFile(requestedPath) {
  const resolved = await resolveExistingAppFile(requestedPath, {
    allowedExtensions: [".json"],
  });
  return JSON.parse(await readFile(resolved.absolutePath, "utf8"));
}

async function readJsonlFile(requestedPath) {
  const resolved = await resolveExistingAppFile(requestedPath, {
    allowedExtensions: [".jsonl"],
  });
  return readFile(resolved.absolutePath, "utf8");
}

async function main() {
  const options = parseCliArguments(process.argv.slice(2));
  try {
    const corpus = await readJsonFile(options.corpusPath);
    const corpusErrors = validateAcceptanceCorpus(corpus);
    if (options.corpusOnly) {
      printCorpusOnly(corpus, corpusErrors, options.jsonMode);
      return;
    }

    const parsed = parseResultsJsonl(await readJsonlFile(options.resultsPath));
    const summary = addParseFailures(evaluateAcceptance(corpus, parsed.entries), parsed.errors);
    if (options.jsonMode) console.log(JSON.stringify(toPublicSummary(summary), null, 2));
    else printHuman(summary);
    if (!summary.gatePassed) process.exitCode = 1;
  } catch (error) {
    console.error(`Acceptance evaluation failed (${safeFileErrorCode(error)}).`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  await main();
}

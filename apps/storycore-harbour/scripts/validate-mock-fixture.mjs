#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolveExistingAppFile, safeFileErrorCode } from "./safe-path.mjs";
import { validateProject } from "./validate-project.mjs";

function extractText(result) {
  if (typeof result === "string") return result;
  if (typeof result?.content === "string") return result.content;
  if (typeof result?.content?.text === "string") return result.content.text;
  if (Array.isArray(result?.content)) {
    return result.content.map((item) => item?.text || "").join("");
  }
  return null;
}

export function validateMockFixture(source) {
  const errors = [];
  const lines = String(source)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return ["Fixture must contain at least one JSONL entry."];

  let completionCount = 0;
  for (const [index, line] of lines.entries()) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      errors.push(`Line ${index + 1} is not valid JSON.`);
      continue;
    }

    if (entry?.ns !== "llm" || entry?.method !== "complete") {
      errors.push(`Line ${index + 1} must mock ns=llm and method=complete.`);
      continue;
    }

    completionCount += 1;
    const text = extractText(entry.result);
    if (!text) {
      errors.push(`Line ${index + 1} does not contain an MCP-shaped text result.`);
      continue;
    }

    let project;
    try {
      project = JSON.parse(text);
    } catch {
      errors.push(`Line ${index + 1} result text is not valid project JSON.`);
      continue;
    }

    const projectErrors = validateProject(project);
    for (const error of projectErrors) {
      errors.push(`Line ${index + 1}: ${error}`);
    }
  }

  if (completionCount === 0) errors.push("Fixture must contain at least one llm.complete response.");
  return errors;
}

async function main() {
  const requestedPath = process.argv[2] || "fixtures/happy-path.jsonl";
  let displayPath = "mock fixture";
  try {
    const resolved = await resolveExistingAppFile(requestedPath, {
      allowedExtensions: [".jsonl"],
    });
    displayPath = resolved.displayPath;
    const errors = validateMockFixture(await readFile(resolved.absolutePath, "utf8"));
    if (errors.length) {
      console.error(`Mock fixture validation failed (${errors.length}):`);
      for (const error of errors) console.error(`- ${error}`);
      process.exitCode = 1;
      return;
    }
    console.log(`Valid StoryCore Harbour mock LLM fixture: ${displayPath}`);
  } catch (error) {
    console.error(`Unable to validate ${displayPath} (${safeFileErrorCode(error)}).`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  await main();
}

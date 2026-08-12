#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { validateProject } from "../bundle/project-contract.js";

export { PROJECT_SCHEMA, SUPPORTED_FORMATS, validateProject } from "../bundle/project-contract.js";

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: node scripts/validate-project.mjs <project.json>");
    process.exitCode = 2;
    return;
  }

  try {
    const project = JSON.parse(await readFile(path, "utf8"));
    const errors = validateProject(project);
    if (errors.length) {
      console.error(`Contract validation failed (${errors.length}):`);
      for (const error of errors) console.error(`- ${error}`);
      process.exitCode = 1;
      return;
    }
    console.log(`Valid StoryCore Harbour project: ${path}`);
  } catch (error) {
    console.error(`Unable to validate ${path}: ${error.message}`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  await main();
}

#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { validateProject } from "../bundle/project-contract.js";
import { resolveExistingAppFile, safeFileErrorCode } from "./safe-path.mjs";

export { PROJECT_SCHEMA, SUPPORTED_FORMATS, validateProject } from "../bundle/project-contract.js";

async function main() {
  const requestedPath = process.argv[2];
  if (!requestedPath) {
    console.error("Usage: node scripts/validate-project.mjs <app-local-project.json>");
    process.exitCode = 2;
    return;
  }

  let displayPath = "project file";
  try {
    const resolved = await resolveExistingAppFile(requestedPath, {
      allowedExtensions: [".json"],
    });
    displayPath = resolved.displayPath;
    const project = JSON.parse(await readFile(resolved.absolutePath, "utf8"));
    const errors = validateProject(project);
    if (errors.length) {
      console.error(`Contract validation failed (${errors.length}):`);
      for (const error of errors) console.error(`- ${error}`);
      process.exitCode = 1;
      return;
    }
    console.log(`Valid StoryCore Harbour project: ${displayPath}`);
  } catch (error) {
    console.error(`Unable to validate ${displayPath} (${safeFileErrorCode(error)}).`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  await main();
}

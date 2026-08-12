#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const canonical = await readFile("acceptance/prompts.json", "utf8");
const bundled = await readFile("bundle/acceptance-prompts.json", "utf8");

if (canonical !== bundled) {
  console.error("bundle/acceptance-prompts.json is out of sync with acceptance/prompts.json.");
  console.error("Run: npm run acceptance:sync");
  process.exitCode = 1;
} else {
  console.log("Bundled acceptance corpus matches the canonical corpus.");
}

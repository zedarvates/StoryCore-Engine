#!/usr/bin/env node
import { copyFile } from "node:fs/promises";

await copyFile("acceptance/prompts.json", "bundle/acceptance-prompts.json");
console.log("Copied acceptance/prompts.json to bundle/acceptance-prompts.json.");

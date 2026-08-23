import { mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

import { validateProject } from "../bundle/project-contract.js";

export async function persistDemoExport({ outputDirectory, filename, text }) {
  const project = JSON.parse(text);
  const errors = validateProject(project);

  if (errors.length > 0) {
    throw new Error("Cannot persist an invalid StoryCore Harbour demo export.");
  }

  await mkdir(outputDirectory, { recursive: true });
  const outputPath = join(outputDirectory, basename(filename));
  await writeFile(outputPath, `${JSON.stringify(project, null, 2)}\n`, "utf8");
  return outputPath;
}

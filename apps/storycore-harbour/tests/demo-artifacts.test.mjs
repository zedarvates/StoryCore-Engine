import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import sampleProject from "../examples/sample-project.json" with { type: "json" };
import { persistDemoExport } from "../scripts/demo-artifacts.mjs";

test("demo export persists a valid project inside the artifact directory", async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), "storycore-harbour-demo-"));

  try {
    const outputPath = await persistDemoExport({
      outputDirectory,
      filename: "../the-last-ferry.storycore-harbour.json",
      text: JSON.stringify(sampleProject),
    });

    assert.equal(outputPath, join(outputDirectory, "the-last-ferry.storycore-harbour.json"));
    assert.deepEqual(JSON.parse(await readFile(outputPath, "utf8")), sampleProject);
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
});

test("demo export rejects an invalid project before writing an artifact", async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), "storycore-harbour-demo-"));

  try {
    await assert.rejects(
      persistDemoExport({
        outputDirectory,
        filename: "invalid.storycore-harbour.json",
        text: JSON.stringify({ schemaVersion: "wrong" }),
      }),
      /Cannot persist an invalid StoryCore Harbour demo export/,
    );
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
});

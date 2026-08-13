import test from "node:test";
import assert from "node:assert/strict";
import { resolveExistingAppFile } from "../scripts/safe-path.mjs";

test("safe path resolves an existing app-local JSON file", async () => {
  const resolved = await resolveExistingAppFile("examples/sample-project.json", {
    allowedExtensions: [".json"],
  });

  assert.equal(resolved.displayPath, "examples/sample-project.json");
  assert.match(resolved.absolutePath, /storycore-harbour[\\/]examples[\\/]sample-project\.json$/);
});

test("safe path rejects traversal outside StoryCore Harbour", async () => {
  await assert.rejects(
    () => resolveExistingAppFile("../../package.json", { allowedExtensions: [".json"] }),
    (error) => error?.code === "ERR_APP_PATH_OUTSIDE_ROOT",
  );
});

test("safe path rejects an app-local file with a disallowed extension", async () => {
  await assert.rejects(
    () => resolveExistingAppFile("README.md", { allowedExtensions: [".json"] }),
    (error) => error?.code === "ERR_APP_PATH_EXTENSION",
  );
});

test("safe path rejects null-byte input before touching the file system", async () => {
  await assert.rejects(
    () => resolveExistingAppFile("examples/sample-project.json\0.txt", { allowedExtensions: [".json"] }),
    (error) => error?.code === "ERR_APP_PATH_INVALID",
  );
});

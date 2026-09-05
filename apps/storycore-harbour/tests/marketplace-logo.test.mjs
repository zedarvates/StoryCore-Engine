import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import test from "node:test";

const APP_ROOT = fileURLToPath(new URL("../", import.meta.url));
const logoPath = resolve(APP_ROOT, "review/marketplace-media/storycore-harbour-logo-256.png");
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

test("committed Marketplace logo is a bounded 256px PNG", async () => {
  const bytes = await readFile(logoPath);

  assert.ok(bytes.subarray(0, 8).equals(pngSignature));
  assert.equal(bytes.subarray(12, 16).toString("ascii"), "IHDR");
  assert.equal(bytes.readUInt32BE(16), 256);
  assert.equal(bytes.readUInt32BE(20), 256);
  assert.ok(bytes.length > 0);
  assert.ok(bytes.length <= 2 * 1024 * 1024);
});

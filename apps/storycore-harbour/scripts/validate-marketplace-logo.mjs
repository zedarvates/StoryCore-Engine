#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const logoPath = resolve(process.argv[2] || "review/marketplace-media/storycore-harbour-logo-256.png");
const executablePath = process.env.BROWSER_EXECUTABLE;
const bytes = await readFile(logoPath);
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

if (!executablePath) {
  console.error("BROWSER_EXECUTABLE is required to inspect the rendered Marketplace logo.");
  process.exit(2);
}

assert.ok(bytes.subarray(0, 8).equals(pngSignature), "Marketplace logo must be a PNG file.");
assert.equal(bytes.subarray(12, 16).toString("ascii"), "IHDR", "PNG must start with an IHDR chunk.");
assert.equal(bytes.readUInt32BE(16), 256, "Marketplace logo width must be 256 pixels.");
assert.equal(bytes.readUInt32BE(20), 256, "Marketplace logo height must be 256 pixels.");
assert.ok(bytes.length <= 2 * 1024 * 1024, "Marketplace logo must not exceed Anna's 2MB limit.");

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
let samples;
try {
  const page = await browser.newPage({ viewport: { width: 256, height: 256 } });
  await page.goto(pathToFileURL(logoPath).href);
  samples = await page.locator("img").evaluate((image) => {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    const pixel = (x, y) => [...context.getImageData(x, y, 1, 1).data];
    return {
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      goldBeacon: pixel(128, 56),
      whiteMast: pixel(128, 128),
      redHull: pixel(128, 152),
      cyanWave: pixel(48, 172),
    };
  });
} finally {
  await browser.close();
}

const near = (actual, expected, tolerance = 12) =>
  expected.every((channel, index) => Math.abs(actual[index] - channel) <= tolerance);
assert.deepEqual([samples.naturalWidth, samples.naturalHeight], [256, 256]);
assert.ok(near(samples.goldBeacon, [247, 198, 90, 255]), "Logo beacon must render gold.");
assert.ok(near(samples.whiteMast, [244, 247, 251, 255]), "Logo mast must render white.");
assert.ok(near(samples.redHull, [239, 75, 95, 255]), "Logo hull must render red.");
assert.ok(near(samples.cyanWave, [71, 215, 232, 255]), "Logo wave must render cyan.");

console.log(JSON.stringify({
  result: "pass",
  logoPath,
  format: "PNG",
  width: 256,
  height: 256,
  bytes: bytes.length,
  maximumBytes: 2 * 1024 * 1024,
  pixelSamples: "pass",
}));

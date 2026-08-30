#!/usr/bin/env node
import { mkdir, readFile } from "node:fs/promises";
import { dirname, fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { chromium } from "playwright-core";

const APP_ROOT = fileURLToPath(new URL("../", import.meta.url));
const inputPath = resolve(APP_ROOT, "bundle/icon.svg");
const outputPath = resolve(APP_ROOT, "review/marketplace-media/storycore-harbour-logo-256.png");
const executablePath = process.env.BROWSER_EXECUTABLE;

if (!executablePath) {
  console.error("BROWSER_EXECUTABLE is required to render the Marketplace logo.");
  process.exit(2);
}

await mkdir(resolve(APP_ROOT, "review/marketplace-media"), { recursive: true });
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  const page = await browser.newPage({ viewport: { width: 256, height: 256 } });
  const source = await readFile(inputPath);
  const sourceUrl = `data:image/svg+xml;base64,${source.toString("base64")}`;
  await page.setContent(`
    <style>
      html, body { margin: 0; width: 256px; height: 256px; background: transparent; }
      img { display: block; width: 256px; height: 256px; }
    </style>
    <img id="marketplace-logo" width="256" height="256" alt="">
  `);
  const logo = page.locator("#marketplace-logo");
  await logo.evaluate((image, src) => {
    image.src = src;
  }, sourceUrl);
  await logo.waitFor({ state: "visible" });
  await logo.evaluate(async (image) => {
    await image.decode();
    if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
      throw new Error("The source logo did not decode before capture.");
    }
  });
  await logo.screenshot({ path: outputPath, omitBackground: true });
  console.log(JSON.stringify({ result: "pass", width: 256, height: 256 }));
} finally {
  await browser.close();
}

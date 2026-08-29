#!/usr/bin/env node
import { mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright-core";

const executablePath = process.env.BROWSER_EXECUTABLE;
const inputPath = resolve(process.argv[2] || "bundle/icon.svg");
const outputPath = resolve(process.argv[3] || "review/marketplace-media/storycore-harbour-logo-256.png");

if (!executablePath) {
  console.error("BROWSER_EXECUTABLE is required to render the Marketplace logo.");
  process.exit(2);
}

await mkdir(dirname(outputPath), { recursive: true });
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
    <img src="${sourceUrl}" width="256" height="256" alt="">
  `);
  const logo = page.locator("img");
  await logo.waitFor({ state: "visible" });
  await logo.evaluate(async (image) => {
    await image.decode();
    if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
      throw new Error("The source logo did not decode before capture.");
    }
  });
  await logo.screenshot({ path: outputPath, omitBackground: true });
  console.log(JSON.stringify({ result: "pass", inputPath, outputPath, width: 256, height: 256 }));
} finally {
  await browser.close();
}

#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright-core";
import { validateProject } from "../bundle/project-contract.js";

const dashboardUrl = process.env.HARBOUR_URL || "http://127.0.0.1:5180/";
const executablePath = process.env.BROWSER_EXECUTABLE;

if (!executablePath) {
  console.error("BROWSER_EXECUTABLE is required for the StoryCore Harbour browser smoke test.");
  process.exit(2);
}

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({
  viewport: { width: 560, height: 720 },
  acceptDownloads: true,
  reducedMotion: "reduce",
});
const page = await context.newPage();
const pageErrors = [];
const tempDirectory = await mkdtemp(join(tmpdir(), "storycore-harbour-browser-"));

page.on("pageerror", (error) => {
  pageErrors.push(error.message);
});

try {
  await page.goto(dashboardUrl, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });

  const frameSelector = 'iframe[src*="/anna-apps/storycore-harbour/dev/"]';
  const frameElement = page.locator(frameSelector);
  await frameElement.waitFor({ state: "attached", timeout: 30_000 });

  // Exercise the exact minimum view dimensions declared in manifest.json.
  await frameElement.evaluate((iframe) => {
    Object.assign(iframe.style, {
      position: "fixed",
      inset: "0 auto auto 0",
      width: "520px",
      height: "680px",
      border: "0",
      zIndex: "2147483647",
    });
  });

  const app = page.frameLocator(frameSelector);
  await app.locator("#concept-form").waitFor({ state: "visible", timeout: 30_000 });
  await assertText(app.locator("#runtime-status"), /Connected to Anna/i);
  assert.equal(await app.locator(".acceptance-panel").count(), 0, "Acceptance mode must remain hidden in the normal App flow.");

  await app.locator("#idea").fill(
    "At dawn, a courier crosses a flooded harbour on the final autonomous ferry to deliver a damaged memory archive before the checkpoint closes.",
  );
  await app.locator("#title").fill("Browser Smoke Story");
  await app.locator("#format").selectOption("short-film");
  await app.locator("#duration").fill("3");
  await app.locator("#language").selectOption("en");
  await app.locator("#tone").fill("Grounded cyberpunk drama with clear visual continuity");
  await app.locator("#audience").fill("Young adult science-fiction viewers");

  const ideaCount = await app.locator("#idea-count").textContent();
  assert.match(ideaCount || "", /\/ 12,000/);

  await app.getByRole("button", { name: "Build my visual story" }).click();
  await app.locator("#step-2").waitFor({ state: "visible", timeout: 30_000 });

  await assertText(app.locator("#world-title"), /^Browser Smoke Story$/);
  await assertText(app.locator("#save-status"), /Saved and verified in your Anna App storage/i);
  assert.ok(await app.locator("#character-list .card").count(), "At least one character card must render.");
  assert.ok(await app.locator("#location-list .card").count(), "At least one location card must render.");

  const dimensions = await app.locator("html").evaluate((root) => ({
    clientWidth: root.clientWidth,
    scrollWidth: root.scrollWidth,
  }));
  assert.equal(dimensions.clientWidth, 520, "The App iframe must be tested at the declared 520px minimum width.");
  assert.ok(
    dimensions.scrollWidth <= dimensions.clientWidth + 1,
    `The minimum-size App must not overflow horizontally (${dimensions.scrollWidth} > ${dimensions.clientWidth}).`,
  );

  await app.getByRole("button", { name: "Continue to scenes" }).click();
  await app.locator("#step-3").waitFor({ state: "visible" });
  assert.ok(await app.locator("#scene-list .scene").count(), "At least one scene must render.");
  assert.ok(await app.locator("#scene-list .shot").count(), "At least one shot must render.");

  await app.getByRole("button", { name: "Review continuity" }).click();
  await app.locator("#step-4").waitFor({ state: "visible" });
  await assertText(app.locator("#continuity-content .score"), /^96$/);

  const downloadPromise = page.waitForEvent("download", { timeout: 15_000 });
  await app.getByRole("button", { name: "Export JSON" }).click();
  const download = await downloadPromise;
  assert.match(download.suggestedFilename(), /^browser-smoke-story\.storycore-harbour\.json$/);

  const exportedPath = join(tempDirectory, download.suggestedFilename());
  await download.saveAs(exportedPath);
  const exportedProject = JSON.parse(await readFile(exportedPath, "utf8"));
  assert.deepEqual(validateProject(exportedProject), []);
  assert.equal(exportedProject.project.title, "Browser Smoke Story");
  assert.equal(exportedProject.metadata?.repairUsed, false);

  assert.deepEqual(pageErrors, [], `Unexpected browser page errors: ${pageErrors.join(" | ")}`);

  console.log(JSON.stringify({
    result: "pass",
    viewport: { width: dimensions.clientWidth, height: 680 },
    charactersRendered: await app.locator("#character-list .card").count(),
    locationsRendered: await app.locator("#location-list .card").count(),
    scenesRendered: await app.locator("#scene-list .scene").count(),
    shotsRendered: await app.locator("#scene-list .shot").count(),
    exportContract: "valid",
  }));
} finally {
  await context.close().catch(() => {});
  await browser.close().catch(() => {});
  await rm(tempDirectory, { recursive: true, force: true });
}

async function assertText(locator, pattern) {
  const text = await locator.textContent();
  assert.match((text || "").trim(), pattern);
}

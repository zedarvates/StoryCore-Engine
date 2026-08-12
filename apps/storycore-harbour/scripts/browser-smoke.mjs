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
const consoleErrors = [];
const failedResponses = [];
const tempDirectory = await mkdtemp(join(tmpdir(), "storycore-harbour-browser-"));

page.on("pageerror", (error) => {
  pageErrors.push(error.message);
});
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("response", (response) => {
  if (response.status() >= 400 && !isIgnorableResponse(response.url())) {
    failedResponses.push(`${response.status()} ${response.url()}`);
  }
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

  // `anna-app dev --mock-llm` currently serves deterministic model fixtures but
  // does not reliably round-trip WindowStore values. The production App keeps
  // using anna.storage unchanged; this browser-only adapter supplies the
  // documented get/set/etag shapes so the UI flow can test persistence and
  // read-back without confusing a harness backend limitation with an App bug.
  const storageAdapterMode = await installDeterministicTestStorage(app);

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
  const outcome = await waitForGenerationOutcome(app, 35_000);
  if (outcome.type !== "success") {
    throw new Error(
      `StoryCore Harbour browser generation ${outcome.type}: ${outcome.detail}. ` +
      `Runtime=${outcome.runtimeStatus}; progress=${outcome.progressDetail}; ` +
      `form=${outcome.formError}; storageAdapter=${storageAdapterMode}; ` +
      `console=${consoleErrors.join(" | ") || "none"}`,
    );
  }

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

  const unexpectedConsoleErrors = consoleErrors.filter(
    (message) => !/Failed to load resource/i.test(message),
  );
  assert.deepEqual(pageErrors, [], `Unexpected browser page errors: ${pageErrors.join(" | ")}`);
  assert.deepEqual(
    unexpectedConsoleErrors,
    [],
    `Unexpected browser console errors: ${unexpectedConsoleErrors.join(" | ")}`,
  );
  assert.deepEqual(
    failedResponses,
    [],
    `Unexpected failed browser responses: ${failedResponses.join(" | ")}`,
  );

  console.log(JSON.stringify({
    result: "pass",
    viewport: { width: dimensions.clientWidth, height: 680 },
    charactersRendered: await app.locator("#character-list .card").count(),
    locationsRendered: await app.locator("#location-list .card").count(),
    scenesRendered: await app.locator("#scene-list .scene").count(),
    shotsRendered: await app.locator("#scene-list .shot").count(),
    exportContract: "valid",
    storage: storageAdapterMode,
  }));
} finally {
  await context.close().catch(() => {});
  await browser.close().catch(() => {});
  await rm(tempDirectory, { recursive: true, force: true });
}

async function installDeterministicTestStorage(app) {
  return app.locator("html").evaluate(() => {
    const runtime = window.anna;
    if (!runtime?.storage) {
      throw new Error("The connected Anna runtime was not exposed to the App window.");
    }

    const rows = new Map();
    let generation = 0;
    const clone = (value) => structuredClone(value);

    const testStorage = {
      async get({ key }) {
        const row = rows.get(key);
        if (!row) return { exists: false, value: null };
        return {
          exists: true,
          value: clone(row.value),
          etag: row.etag,
          generation: row.generation,
        };
      },

      async set({ key, value, if_match }) {
        const current = rows.get(key);
        if (if_match !== undefined && current?.etag !== if_match) {
          const error = new Error("Storage precondition failed in browser adapter.");
          error.name = "precondition_failed";
          error.code = "precondition_failed";
          throw error;
        }

        generation += 1;
        const etag = `W/\"browser-${generation}\"`;
        rows.set(key, {
          value: clone(value),
          etag,
          generation,
        });
        return { etag, generation };
      },
    };

    let mode = "storage-property";
    try {
      Object.defineProperty(runtime, "storage", {
        value: testStorage,
        configurable: true,
        enumerable: true,
        writable: false,
      });
    } catch {
      mode = "storage-assignment";
      runtime.storage = testStorage;
    }

    if (runtime.storage !== testStorage || runtime.storage.get !== testStorage.get) {
      throw new Error("The Anna runtime rejected the deterministic storage namespace replacement.");
    }

    window.__STORYCORE_HARBOUR_TEST_STORAGE__ = {
      mode,
      size: () => rows.size,
    };
    return mode;
  });
}

async function waitForGenerationOutcome(app, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await app.locator("#step-2").isVisible()) return { type: "success" };
    if (await app.locator("#fatal-error").isVisible()) {
      return diagnostics(app, "fatal", await app.locator("#fatal-detail").textContent());
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return diagnostics(app, "timeout", "No success or fatal state became visible before the browser deadline");
}

async function diagnostics(app, type, detail) {
  return {
    type,
    detail: clean(detail),
    runtimeStatus: clean(await app.locator("#runtime-status").textContent()),
    progressDetail: clean(await app.locator("#progress-detail").textContent()),
    formError: clean(await app.locator("#form-error").textContent()),
  };
}

async function assertText(locator, pattern) {
  const text = await locator.textContent();
  assert.match((text || "").trim(), pattern);
}

function isIgnorableResponse(url) {
  try {
    const parsed = new URL(url);
    return parsed.pathname.endsWith("/favicon.ico");
  } catch {
    return false;
  }
}

function clean(value) {
  return String(value || "none").replace(/[\r\n]+/g, " ").slice(0, 500);
}

#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright-core";
import { validateProject } from "../bundle/project-contract.js";
import demoConcept from "../demo/concept.json" with { type: "json" };
import { persistDemoExport } from "./demo-artifacts.mjs";

const dashboardUrl = process.env.HARBOUR_URL || "http://127.0.0.1:5180/";
const executablePath = process.env.BROWSER_EXECUTABLE;
const screenshotDirectory = process.env.HARBOUR_SCREENSHOT_DIR || "";
const minimumFrameSize = { width: 520, height: 680 };
const marketplaceFrameSize = { width: 900, height: 820 };

if (!executablePath) {
  console.error("BROWSER_EXECUTABLE is required for the StoryCore Harbour browser smoke test.");
  process.exit(2);
}

if (screenshotDirectory) {
  await mkdir(screenshotDirectory, { recursive: true });
}

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({
  viewport: { width: 980, height: 900 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const pageErrors = [];
const consoleErrors = [];
const failedResponses = [];
const screenshots = [];
let demoExportPath = "";

page.on("pageerror", (error) => pageErrors.push(error.message));
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
  await setFrameSize(frameElement, minimumFrameSize);

  const app = page.frameLocator(frameSelector);
  await app.locator("#concept-form").waitFor({ state: "visible", timeout: 30_000 });
  await waitForText(app.locator("#runtime-status"), /Connected to Anna/i);
  assert.equal(
    await app.locator(".acceptance-panel").count(),
    0,
    "Acceptance mode must remain hidden in the normal App flow.",
  );
  assert.equal(await app.locator(".steps").getAttribute("role"), "tablist");
  assert.equal(await app.locator("#step-tab-1").getAttribute("aria-selected"), "true");
  assert.equal(await app.locator("#step-1").getAttribute("role"), "tabpanel");

  // The CLI's --mock-llm path serves deterministic model output but its
  // WindowStore does not currently round-trip values. Replace only the
  // connected runtime object's storage namespace inside this browser test.
  // Production code continues to call Anna storage without fallback.
  const storageAdapterMode = await installDeterministicTestStorage(app);
  await installExportCapture(app);

  await fillReferenceProject(app);
  await captureMarketplaceScreenshot({
    app,
    frameElement,
    filename: "01-concept.png",
  });

  // Local form validation must prevent a model call and move keyboard focus to
  // the actionable error announcement.
  await app.locator("#idea").fill("Too short");
  await app.getByRole("button", { name: "Build my visual story" }).click();
  await app.locator("#form-error").waitFor({ state: "visible" });
  await assertText(app.locator("#form-error"), /at least 20 characters/i);
  await waitForFocus(app.locator("#form-error"));
  assert.equal(await app.locator("#step-1").isVisible(), true);
  assert.equal(await app.locator("#step-2").isVisible(), false);

  await fillReferenceProject(app);
  assert.match((await app.locator("#idea-count").textContent()) || "", /\/ 12,000/);

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
  await waitForFocus(app.locator("#world-title"));
  assert.equal(await app.locator("#step-tab-2").getAttribute("aria-selected"), "true");
  assert.equal(await app.locator("#step-2").getAttribute("aria-hidden"), "false");
  assert.ok(await app.locator("#character-list .card").count(), "At least one character card must render.");
  assert.ok(await app.locator("#location-list .card").count(), "At least one location card must render.");

  const dimensions = await app.locator("html").evaluate((root) => ({
    clientWidth: root.clientWidth,
    scrollWidth: root.scrollWidth,
  }));
  assert.equal(
    dimensions.clientWidth,
    minimumFrameSize.width,
    "The App iframe must be tested at the declared 520px minimum width.",
  );
  assert.ok(
    dimensions.scrollWidth <= dimensions.clientWidth + 1,
    `The minimum-size App must not overflow horizontally (${dimensions.scrollWidth} > ${dimensions.clientWidth}).`,
  );

  const reflowDimensions = await app.locator("html").evaluate((root) => {
    root.style.fontSize = "400%";
    return {
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
    };
  });
  assert.ok(
    reflowDimensions.scrollWidth <= reflowDimensions.clientWidth + 1,
    `The minimum-size App must reflow at 400% text without horizontal overflow ` +
      `(${reflowDimensions.scrollWidth} > ${reflowDimensions.clientWidth}).`,
  );
  await app.locator("html").evaluate((root) => {
    root.style.removeProperty("font-size");
  });

  await captureMarketplaceScreenshot({
    app,
    frameElement,
    filename: "02-world.png",
  });

  // Roving-tabindex and ArrowRight navigation must activate the next enabled
  // step, update ARIA selection, and focus its heading.
  await app.locator("#step-tab-2").focus();
  await app.locator("#step-tab-2").press("ArrowRight");
  await app.locator("#step-3").waitFor({ state: "visible" });
  await waitForFocus(app.locator("#step-3 h2"));
  assert.equal(await app.locator("#step-tab-3").getAttribute("aria-selected"), "true");
  assert.ok(await app.locator("#scene-list .scene").count(), "At least one scene must render.");
  assert.ok(await app.locator("#scene-list .shot").count(), "At least one shot must render.");

  await captureMarketplaceScreenshot({
    app,
    frameElement,
    filename: "03-scenes.png",
  });

  await app.locator("#step-tab-3").focus();
  await app.locator("#step-tab-3").press("ArrowRight");
  await app.locator("#step-4").waitFor({ state: "visible" });
  await waitForFocus(app.locator("#step-4 h2"));
  assert.equal(await app.locator("#step-tab-4").getAttribute("aria-selected"), "true");
  await assertText(app.locator("#continuity-content .score"), /^96$/);

  await captureMarketplaceScreenshot({
    app,
    frameElement,
    filename: "04-continuity.png",
  });

  // A new project must clear prior creative content while preserving the
  // saved project for an explicit, verified restore.
  await app.getByRole("button", { name: "Start another project" }).click();
  await app.locator("#step-1").waitFor({ state: "visible" });
  await waitForFocus(app.locator("#idea"));
  assert.equal(await app.locator("#idea").inputValue(), "");
  assert.equal(await app.locator("#idea-count").textContent(), "0 / 12,000");
  assert.equal(await app.locator("#step-tab-2").isDisabled(), true);
  assert.equal(await app.locator("#bible-content").locator("*").count(), 0);
  assert.equal(await app.locator("#character-list").locator("*").count(), 0);
  assert.equal(await app.locator("#location-list").locator("*").count(), 0);
  assert.equal(await app.locator("#scene-list").locator("*").count(), 0);
  assert.equal(await app.locator("#continuity-content").locator("*").count(), 0);

  await app.getByRole("button", { name: "Load latest saved project" }).click();
  await app.locator("#step-2").waitFor({ state: "visible" });
  await waitForFocus(app.locator("#world-title"));
  await assertText(app.locator("#world-title"), /^Browser Smoke Story$/);
  await assertText(app.locator("#save-status"), /Latest saved project loaded and verified/i);
  assert.ok(await app.locator("#character-list .card").count());
  assert.ok(await app.locator("#location-list .card").count());
  assert.ok(await app.locator("#scene-list .scene").count());
  assert.ok(await app.locator("#scene-list .shot").count());

  await app.locator("#step-tab-4").click();
  await app.locator("#step-4").waitFor({ state: "visible" });
  await waitForFocus(app.locator("#step-4 h2"));

  // Sandboxed Anna App iframes do not necessarily surface a top-level browser
  // download event. Capture the exact Blob and filename produced by the real
  // export button instead of weakening the App or the sandbox.
  await app.getByRole("button", { name: "Export JSON" }).click();
  const exported = await readCapturedExport(app);
  assert.match(exported.filename, /^browser-smoke-story\.storycore-harbour\.json$/);
  const exportedProject = JSON.parse(exported.text);
  assert.deepEqual(validateProject(exportedProject), []);
  assert.equal(exportedProject.project.title, "Browser Smoke Story");
  assert.equal(exportedProject.metadata?.repairUsed, false);

  if (screenshotDirectory) {
    demoExportPath = await persistDemoExport({
      outputDirectory: screenshotDirectory,
      filename: exported.filename,
      text: exported.text,
    });
    assert.deepEqual(
      screenshots.map((path) => path.split(/[\\/]/).at(-1)),
      ["01-concept.png", "02-world.png", "03-scenes.png", "04-continuity.png"],
      "The browser flow must create exactly the four expected Marketplace screenshot drafts.",
    );
  }

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
    viewport: { width: dimensions.clientWidth, height: minimumFrameSize.height },
    textReflow400Percent: "pass",
    formValidationFocus: "pass",
    keyboardStepNavigation: "pass",
    panelFocusManagement: "pass",
    newProjectReset: "pass",
    savedProjectRestore: "pass",
    charactersRendered: await app.locator("#character-list .card").count(),
    locationsRendered: await app.locator("#location-list .card").count(),
    scenesRendered: await app.locator("#scene-list .scene").count(),
    shotsRendered: await app.locator("#scene-list .shot").count(),
    exportContract: "valid",
    demoExportPath,
    screenshotsCaptured: screenshots.length,
    storage: storageAdapterMode,
  }));
} finally {
  await context.close().catch(() => {});
  await browser.close().catch(() => {});
}

async function fillReferenceProject(app) {
  await app.locator("#idea").fill(demoConcept.idea);
  await app.locator("#title").fill(demoConcept.title);
  await app.locator("#format").selectOption(demoConcept.format);
  await app.locator("#duration").fill(String(demoConcept.durationMinutes));
  await app.locator("#language").selectOption(demoConcept.language);
  await app.locator("#tone").fill(demoConcept.tone);
  await app.locator("#audience").fill(demoConcept.audience);
}

async function captureMarketplaceScreenshot({ app, frameElement, filename }) {
  if (!screenshotDirectory) return;

  await setFrameSize(frameElement, marketplaceFrameSize);
  await app.locator("html").evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo({ top: 0, behavior: "instant" });
  });

  const path = join(screenshotDirectory, filename);
  await frameElement.screenshot({
    path,
    animations: "disabled",
    caret: "hide",
  });
  screenshots.push(path);

  await setFrameSize(frameElement, minimumFrameSize);
}

async function setFrameSize(frameElement, size) {
  await frameElement.evaluate((iframe, next) => {
    Object.assign(iframe.style, {
      position: "fixed",
      inset: "0 auto auto 0",
      width: `${next.width}px`,
      height: `${next.height}px`,
      border: "0",
      zIndex: "2147483647",
    });
  }, size);
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
        const etag = `W/"browser-${generation}"`;
        rows.set(key, { value: clone(value), etag, generation });
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
    return mode;
  });
}

async function installExportCapture(app) {
  await app.locator("html").evaluate(() => {
    const capture = { blob: null, filename: null };
    const createObjectURL = URL.createObjectURL.bind(URL);

    URL.createObjectURL = (blob) => {
      capture.blob = blob;
      return createObjectURL(blob);
    };
    URL.revokeObjectURL = () => {};
    HTMLAnchorElement.prototype.click = function click() {
      capture.filename = this.download;
    };
    window.__STORYCORE_HARBOUR_EXPORT_CAPTURE__ = capture;
  });
}

async function readCapturedExport(app) {
  return app.locator("html").evaluate(async () => {
    const deadline = Date.now() + 5_000;
    const capture = window.__STORYCORE_HARBOUR_EXPORT_CAPTURE__;
    while ((!capture?.blob || !capture?.filename) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    if (!capture?.blob || !capture?.filename) {
      throw new Error("The export button did not produce a Blob and filename.");
    }
    return {
      filename: capture.filename,
      text: await capture.blob.text(),
    };
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

async function waitForFocus(locator, timeoutMs = 5_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await locator.evaluate((node) => document.activeElement === node)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Expected element did not receive keyboard focus.");
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

async function waitForText(locator, pattern, timeoutMs = 10_000) {
  await locator.filter({ hasText: pattern }).waitFor({ state: "visible", timeout: timeoutMs });
}

function isIgnorableResponse(url) {
  try {
    return new URL(url).pathname.endsWith("/favicon.ico");
  } catch {
    return false;
  }
}

function clean(value) {
  return String(value || "none").replace(/[\r\n]+/g, " ").slice(0, 500);
}

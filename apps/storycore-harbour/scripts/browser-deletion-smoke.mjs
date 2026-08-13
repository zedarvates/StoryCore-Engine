#!/usr/bin/env node
import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const dashboardUrl = process.env.HARBOUR_URL || "http://127.0.0.1:5180/";
const executablePath = process.env.BROWSER_EXECUTABLE;
const compareText = (left, right) => left.localeCompare(right);

if (!executablePath) {
  console.error("BROWSER_EXECUTABLE is required for the StoryCore Harbour deletion smoke test.");
  process.exit(2);
}

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({
  viewport: { width: 560, height: 720 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const pageErrors = [];
const consoleErrors = [];

page.on("pageerror", (error) => pageErrors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error" && !/Failed to load resource/i.test(message.text())) {
    consoleErrors.push(message.text());
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
  await waitForText(app.locator("#runtime-status"), /Connected to Anna/i);
  await installDeterministicStorage(app);

  await app.locator("#idea").fill(
    "At dawn, a courier crosses a flooded harbour on the final autonomous ferry to deliver a damaged memory archive before the checkpoint closes.",
  );
  await app.locator("#title").fill("Deletion Smoke Story");
  await app.locator("#format").selectOption("short-film");
  await app.locator("#duration").fill("3");
  await app.locator("#language").selectOption("en");
  await app.locator("#tone").fill("Grounded cyberpunk drama with clear visual continuity");
  await app.locator("#audience").fill("Young adult science-fiction viewers");

  await app.getByRole("button", { name: "Build my visual story" }).click();
  await waitForOutcome(app, 35_000);

  const before = await storageSnapshot(app);
  const currentProject = before.currentProject;
  assert.equal(before.projectKeys.length, 2, "The normal flow must create the current project and one snapshot.");
  assert.ok(before.projectKeys.includes("projects/current"), "The normal flow must create projects/current.");
  assert.ok(
    before.projectKeys.includes(`projects/by-id/${currentProject?.project?.id}`),
    "The snapshot key must use the locally assigned project id.",
  );
  assert.ok(before.allKeys.includes("settings/keep"), "The unrelated App key must exist before project deletion.");

  await app.locator("#step-tab-4").click();
  await app.locator("#step-4").waitFor({ state: "visible" });
  const deleteButton = app.locator("#step-4 .delete-projects-button");
  await deleteButton.click();
  await assertText(deleteButton, /Confirm permanent deletion/i);
  await assertText(app.locator("#deletion-status"), /again within 15 seconds/i);
  assert.equal(
    await deleteButton.getAttribute("aria-label"),
    "Confirm permanent deletion",
    "The dynamic accessible name must exactly match the visible confirmation label.",
  );

  await deleteButton.click();
  await app.locator("#step-1").waitFor({ state: "visible", timeout: 10_000 });
  await assertText(app.locator("#deletion-status"), /Deleted 2 saved StoryCore Harbour project records/i);

  const after = await storageSnapshot(app);
  assert.deepEqual(after.projectKeys, [], "All StoryCore Harbour project keys must be deleted.");
  assert.deepEqual(after.allKeys, ["settings/keep"], "Deletion must preserve App data outside the projects/ prefix.");

  assert.equal(await app.locator("#idea").inputValue(), "", "Deletion must clear the source idea from the form.");
  assert.equal(await app.locator("#title").inputValue(), "", "Deletion must clear the working title from the form.");
  assert.equal(await app.locator("#idea-count").textContent(), "0 / 12,000");

  await app.getByRole("button", { name: "Load latest saved project" }).click();
  await app.locator("#form-error").waitFor({ state: "visible" });
  await assertText(app.locator("#form-error"), /No saved StoryCore Harbour project was found/i);

  const diagnostics = await app.locator("html").evaluate(() => window.__STORYCORE_HARBOUR_TEST_STORAGE__.diagnostics());
  assert.ok(diagnostics.listCalls >= 2, "Deletion must list the projects/ prefix before and after deleting.");
  assert.equal(diagnostics.deleteCalls, 2, "Deletion must issue one ETag-protected delete per project record.");
  assert.equal(diagnostics.deletesWithEtag, 2, "Every project deletion must carry its opaque ETag.");

  assert.deepEqual(pageErrors, [], `Unexpected browser page errors: ${pageErrors.join(" | ")}`);
  assert.deepEqual(consoleErrors, [], `Unexpected browser console errors: ${consoleErrors.join(" | ")}`);

  console.log(JSON.stringify({
    result: "pass",
    deletedProjectRecords: diagnostics.deleteCalls,
    deletesWithEtag: diagnostics.deletesWithEtag,
    listCalls: diagnostics.listCalls,
    unrelatedKeyPreserved: true,
    reloadAfterDeletion: "not-found",
  }));
} finally {
  await context.close().catch(() => {});
  await browser.close().catch(() => {});
}

async function installDeterministicStorage(app) {
  await app.locator("html").evaluate(() => {
    const runtime = window.anna;
    if (!runtime?.storage) throw new Error("Anna runtime storage is unavailable.");

    const rows = new Map();
    let generation = 1;
    let listCalls = 0;
    let deleteCalls = 0;
    let deletesWithEtag = 0;
    const clone = (value) => structuredClone(value);

    rows.set("settings/keep", {
      value: { keep: true },
      etag: 'W/"unrelated-1"',
      generation: 1,
      kind: "kv",
    });

    const storage = {
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
          const error = new Error("Storage precondition failed in deletion adapter.");
          error.name = "precondition_failed";
          error.code = "precondition_failed";
          throw error;
        }
        generation += 1;
        const etag = `W/"deletion-${generation}"`;
        rows.set(key, {
          value: clone(value),
          etag,
          generation,
          kind: "kv",
        });
        return { etag, generation };
      },

      async list({ prefix = "", cursor, limit = 100, kind = "kv" }) {
        listCalls += 1;
        const offset = cursor ? Number(cursor) : 0;
        const all = [...rows.entries()]
          .filter(([key, row]) => key.startsWith(prefix) && row.kind === kind)
          .sort(([left], [right]) => left.localeCompare(right));
        const pageSize = Math.max(1, Math.min(Number(limit) || 100, 100));
        const page = all.slice(offset, offset + pageSize);
        const nextOffset = offset + page.length;
        return {
          items: page.map(([key, row]) => ({
            key,
            etag: row.etag,
            generation: row.generation,
            kind: row.kind,
            updated_at: "2026-08-12T12:00:00.000Z",
          })),
          next_cursor: nextOffset < all.length ? String(nextOffset) : null,
        };
      },

      async delete({ key, if_match }) {
        deleteCalls += 1;
        const current = rows.get(key);
        if (!current) return { deleted: false };
        if (if_match !== undefined) deletesWithEtag += 1;
        if (if_match !== undefined && current.etag !== if_match) {
          const error = new Error("Storage precondition failed in deletion adapter.");
          error.name = "precondition_failed";
          error.code = "precondition_failed";
          throw error;
        }
        rows.delete(key);
        return { deleted: true };
      },
    };

    Object.defineProperty(runtime, "storage", {
      value: storage,
      configurable: true,
      enumerable: true,
      writable: false,
    });

    window.__STORYCORE_HARBOUR_TEST_STORAGE__ = {
      snapshot() {
        const allKeys = [...rows.keys()].sort((left, right) => left.localeCompare(right));
        return {
          allKeys,
          projectKeys: allKeys.filter((key) => key.startsWith("projects/")),
          currentProject: clone(rows.get("projects/current")?.value),
        };
      },
      diagnostics() {
        return { listCalls, deleteCalls, deletesWithEtag };
      },
    };
  });
}

async function storageSnapshot(app) {
  return app.locator("html").evaluate(() => window.__STORYCORE_HARBOUR_TEST_STORAGE__.snapshot());
}

async function waitForOutcome(app, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await app.locator("#step-2").isVisible()) return;
    if (await app.locator("#fatal-error").isVisible()) {
      throw new Error((await app.locator("#fatal-detail").textContent()) || "Generation failed.");
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Generation did not reach a terminal UI state before the deletion-test timeout.");
}

async function assertText(locator, pattern) {
  const text = await locator.textContent();
  assert.match((text || "").trim(), pattern);
}

async function waitForText(locator, pattern, timeoutMs = 10_000) {
  await locator.filter({ hasText: pattern }).waitFor({ state: "visible", timeout: timeoutMs });
}

import { validateProject } from "./project-contract.js";
import { acceptanceModeEnabled } from "./acceptance-mode.js";
import { publicFailureName } from "./acceptance-failure.js";

const acceptanceEnabled = acceptanceModeEnabled({
  locationSearch: window.location.search,
  referrer: document.referrer,
});

if (acceptanceEnabled) {
  await installAcceptanceRunner();
}

async function installAcceptanceRunner() {
  hideNormalPanels();
  const ui = createAcceptancePanel();
  document.querySelector("main").prepend(ui.panel);

  const corpus = await loadAcceptanceCorpus(ui.progress);
  if (!corpus) return;

  const controller = {
    anna: await waitForAnnaRuntime(),
    corpus,
    results: [],
    running: false,
    stopRequested: false,
    ui,
  };
  wireAcceptanceControls(controller);
  ui.progress.textContent = "Corpus loaded. Select the confirmation box to enable the run.";
  ui.runButton.disabled = !ui.consent.checked;
}

function hideNormalPanels() {
  const normalPanels = [
    ...document.querySelectorAll(".steps, .step-panel, .progress-card, .error-panel"),
  ];
  normalPanels.forEach((node) => {
    node.dataset.acceptanceDisplay = node.style.display || "";
    node.style.display = "none";
  });
}

function createAcceptancePanel() {
  const panel = element("section", null, "panel acceptance-panel");
  panel.append(
    element("p", "DEVELOPER ACCEPTANCE MODE", "eyebrow"),
    element("h2", "Run the fixed StoryCore Harbour reliability corpus"),
    element(
      "p",
      "This local developer mode submits 20 fixed projects sequentially through the real UI flow. It may make up to 40 model calls when repair is needed and stores test projects in the current Anna account.",
    ),
  );

  const consentLabel = element("label", null, "acceptance-consent");
  const consent = document.createElement("input");
  consent.type = "checkbox";
  consent.id = "acceptance-consent";
  consentLabel.append(
    consent,
    document.createTextNode(" I understand the model-quota and storage impact."),
  );
  panel.append(consentLabel);

  const actions = element("div", null, "actions");
  const runButton = button("Run 20 prompts", true);
  const stopButton = button("Stop after current prompt", true);
  const downloadButton = button("Download current JSONL", true);
  actions.append(runButton, stopButton, downloadButton);
  panel.append(actions);

  const progress = element("p", "Loading acceptance corpus…", "message");
  progress.setAttribute("aria-live", "polite");
  const counters = element("p", "0 / 20 complete", "scene-meta");
  const list = element("ol", null, "acceptance-results");
  panel.append(progress, counters, list);

  return {
    panel,
    consent,
    runButton,
    stopButton,
    downloadButton,
    progress,
    counters,
    list,
  };
}

async function loadAcceptanceCorpus(progress) {
  try {
    const response = await fetch("acceptance-prompts.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const corpus = await response.json();
    const validShape =
      corpus?.schemaVersion === "storycore-harbour.acceptance.v1" &&
      corpus?.prompts?.length === 20;
    if (!validShape) throw new Error("The bundled corpus is missing or out of sync.");
    return corpus;
  } catch (error) {
    progress.textContent = `Acceptance corpus could not be loaded: ${safeText(error?.message)}`;
    return null;
  }
}

function waitForAnnaRuntime(timeoutMs = 5_000) {
  if (window.anna) return Promise.resolve(window.anna);
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(window.anna || null), timeoutMs);
    window.addEventListener(
      "storycore-harbour:anna-ready",
      () => {
        window.clearTimeout(timer);
        resolve(window.anna || null);
      },
      { once: true },
    );
  });
}

function wireAcceptanceControls(controller) {
  const { ui } = controller;
  ui.consent.addEventListener("change", () => {
    ui.runButton.disabled = controller.running || !ui.consent.checked;
  });

  ui.stopButton.addEventListener("click", () => {
    controller.stopRequested = true;
    ui.stopButton.disabled = true;
    ui.progress.textContent = "Stop requested. The current prompt will finish first.";
  });

  ui.downloadButton.addEventListener("click", () => downloadJsonl(controller.results));
  ui.runButton.addEventListener("click", () => runAcceptanceCorpus(controller));
}

async function runAcceptanceCorpus(controller) {
  const { ui } = controller;
  if (controller.running || !ui.consent.checked) return;

  beginRun(controller);
  for (const [index, prompt] of controller.corpus.prompts.entries()) {
    if (controller.stopRequested) break;
    await runAcceptancePrompt(controller, prompt, index);
    updateCounters(controller);
  }
  finishRun(controller);
}

function beginRun(controller) {
  controller.running = true;
  controller.stopRequested = false;
  controller.results.length = 0;
  controller.ui.runButton.disabled = true;
  controller.ui.stopButton.disabled = false;
  controller.ui.downloadButton.disabled = true;
  clearNode(controller.ui.list);
}

async function runAcceptancePrompt(controller, prompt, index) {
  const { corpus, ui } = controller;
  ui.progress.textContent = `Running ${prompt.id} (${index + 1} of ${corpus.prompts.length})…`;
  const row = element("li", `${prompt.id}: running…`);
  ui.list.append(row);
  const started = performance.now();

  try {
    prepareForm(prompt.input);
    document.getElementById("concept-form").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    const outcome = await waitForUiOutcome(190_000);
    const durationMs = Math.round(performance.now() - started);
    if (outcome === "failure") {
      recordVisibleFailure(controller.results, row, prompt.id, durationMs);
      resetUiAfterFailure();
      return;
    }

    const project = await readCurrentProject(controller.anna);
    recordProjectOutcome(controller.results, row, prompt, project, durationMs);
    resetUiAfterSuccess();
  } catch (error) {
    const durationMs = Math.round(performance.now() - started);
    recordCollectorFailure(controller.results, row, prompt.id, durationMs, error);
    resetUiAfterFailure();
  }
}

function recordVisibleFailure(results, row, promptId, durationMs) {
  const visible = document.getElementById("fatal-detail")?.textContent || "UI run failed";
  const category = classifyVisibleError(visible);
  results.push({
    promptId,
    durationMs,
    repairUsed: false,
    error: { category, name: publicFailureName(visible, category) },
  });
  row.textContent = `${promptId}: FAIL (${category})`;
}

function recordProjectOutcome(results, row, prompt, project, durationMs) {
  const validationErrors = validateProject(project);
  const inputErrors = compareInput(project, prompt.input);
  const repairUsed = project?.metadata?.repairUsed === true;

  if (validationErrors.length || inputErrors.length) {
    results.push({
      promptId: prompt.id,
      durationMs,
      repairUsed,
      error: {
        category: "contract",
        name: validationErrors.length ? "contract_invalid" : "input_mismatch",
      },
    });
    row.textContent = `${prompt.id}: FAIL (contract)`;
    return;
  }

  results.push({
    promptId: prompt.id,
    durationMs,
    repairUsed,
    project,
  });
  const repairLabel = repairUsed ? " after repair" : "";
  row.textContent = `${prompt.id}: PASS${repairLabel} (${formatDuration(durationMs)})`;
}

function recordCollectorFailure(results, row, promptId, durationMs, error) {
  const category = /timeout/i.test(error?.message || "") ? "timeout" : "runtime";
  results.push({
    promptId,
    durationMs,
    repairUsed: false,
    error: { category, name: category === "timeout" ? "timeout" : "collector_error" },
  });
  row.textContent = `${promptId}: FAIL (${category})`;
}

function updateCounters(controller) {
  controller.ui.counters.textContent =
    `${controller.results.length} / ${controller.corpus.prompts.length} complete`;
  controller.ui.downloadButton.disabled = controller.results.length === 0;
}

function finishRun(controller) {
  controller.running = false;
  controller.ui.stopButton.disabled = true;
  controller.ui.runButton.disabled = !controller.ui.consent.checked;

  const passes = controller.results.filter((entry) => entry.project).length;
  const repaired = controller.results.filter((entry) => entry.repairUsed).length;
  if (controller.stopRequested) {
    controller.ui.progress.textContent =
      `Stopped with ${passes}/${controller.results.length} completed runs passing. ` +
      "Download the partial JSONL.";
    return;
  }
  controller.ui.progress.textContent =
    `Finished: ${passes}/${controller.corpus.prompts.length} passed; ${repaired} used repair. ` +
    "Download the JSONL, then run npm run acceptance:evaluate.";
}

function prepareForm(input) {
  document.getElementById("idea").value = input.idea;
  document.getElementById("title").value = input.title;
  document.getElementById("format").value = input.format;
  document.getElementById("duration").value = String(input.durationMinutes);
  document.getElementById("language").value = input.language;
  document.getElementById("tone").value = input.tone;
  document.getElementById("audience").value = input.audience;
  document.getElementById("idea").dispatchEvent(new Event("input", { bubbles: true }));
}

function waitForUiOutcome(timeoutMs) {
  return new Promise((resolve, reject) => {
    const started = performance.now();
    const tick = () => {
      const fatal = document.getElementById("fatal-error");
      const world = document.getElementById("step-2");
      if (fatal && !fatal.hidden) return resolve("failure");
      if (world && !world.hidden) return resolve("success");
      if (performance.now() - started >= timeoutMs) {
        return reject(new Error("Acceptance prompt timed out."));
      }
      window.setTimeout(tick, 250);
    };
    tick();
  });
}

async function readCurrentProject(anna) {
  if (anna) {
    const result = await anna.storage.get({ key: "projects/current" });
    if (!result?.exists) throw new Error("Saved project missing after successful UI flow.");
    return result.value;
  }
  const value = localStorage.getItem("projects/current");
  if (!value) throw new Error("Local preview project missing after successful UI flow.");
  return JSON.parse(value);
}

function compareInput(project, input) {
  const identity = project?.project || {};
  const errors = [];
  for (const field of ["language", "format", "audience", "tone"]) {
    if (identity[field] !== input[field]) errors.push(field);
  }
  if (Number(identity.durationMinutes) !== Number(input.durationMinutes)) {
    errors.push("durationMinutes");
  }
  if (identity.sourceIdea !== input.idea) errors.push("sourceIdea");
  if (input.title && identity.title !== input.title) errors.push("title");
  return errors;
}

function resetUiAfterSuccess() {
  document.getElementById("new-button")?.click();
}

function resetUiAfterFailure() {
  document.getElementById("retry-button")?.click();
}

function classifyVisibleError(message) {
  const value = String(message || "").toLowerCase();
  if (value.includes("quota")) return "quota";
  if (value.includes("permission")) return "permission";
  if (value.includes("provider")) return "provider";
  if (value.includes("timed out") || value.includes("timeout")) return "timeout";
  if (value.includes("storage") || value.includes("saved")) return "storage";
  if (value.includes("json") || value.includes("validation") || value.includes("contract")) {
    return "contract";
  }
  return "unknown";
}

function downloadJsonl(results) {
  if (!results.length) return;
  const text = `${results.map((entry) => JSON.stringify(entry)).join("\n")}\n`;
  const blob = new Blob([text], { type: "application/x-ndjson" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download =
    `storycore-harbour-acceptance-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== null && text !== undefined) node.textContent = String(text);
  if (className) node.className = className;
  return node;
}

function button(text, disabled) {
  const node = element("button", text);
  node.type = "button";
  node.disabled = disabled;
  return node;
}

function clearNode(node) {
  while (node.firstChild) node.firstChild.remove();
}

function formatDuration(ms) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function safeText(value) {
  return String(value || "unknown").replace(/[\r\n]+/g, " ").slice(0, 180);
}

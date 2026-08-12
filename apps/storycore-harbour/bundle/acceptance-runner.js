import { AnnaAppRuntime } from "/static/anna-apps/_sdk/latest/index.js";
import { validateProject } from "./project-contract.js";

const params = new URLSearchParams(window.location.search);
const acceptanceEnabled = params.get("acceptance") === "1";

if (acceptanceEnabled) {
  await installAcceptanceRunner();
}

async function installAcceptanceRunner() {
  const $ = (id) => document.getElementById(id);
  const main = document.querySelector("main");
  const normalPanels = [...document.querySelectorAll(".steps, .step-panel, .progress-card, .error-panel")];
  normalPanels.forEach((node) => {
    node.dataset.acceptanceDisplay = node.style.display || "";
    node.style.display = "none";
  });

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
  consentLabel.append(consent, document.createTextNode(" I understand the model-quota and storage impact."));
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
  main.prepend(panel);

  let corpus;
  try {
    const response = await fetch("acceptance-prompts.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    corpus = await response.json();
    if (corpus?.schemaVersion !== "storycore-harbour.acceptance.v1" || corpus?.prompts?.length !== 20) {
      throw new Error("The bundled corpus is missing or out of sync.");
    }
    progress.textContent = "Corpus loaded. Select the confirmation box to enable the run.";
    runButton.disabled = !consent.checked;
  } catch (error) {
    progress.textContent = `Acceptance corpus could not be loaded: ${safeText(error?.message)}`;
    return;
  }

  let anna = null;
  try {
    anna = window.anna || await AnnaAppRuntime.connect();
  } catch {
    // Local preview fallback uses localStorage. Real acceptance must use Anna.
  }

  const results = [];
  let running = false;
  let stopRequested = false;

  consent.addEventListener("change", () => {
    runButton.disabled = running || !consent.checked;
  });

  stopButton.addEventListener("click", () => {
    stopRequested = true;
    stopButton.disabled = true;
    progress.textContent = "Stop requested. The current prompt will finish first.";
  });

  downloadButton.addEventListener("click", () => downloadJsonl(results));

  runButton.addEventListener("click", async () => {
    if (running || !consent.checked) return;
    running = true;
    stopRequested = false;
    runButton.disabled = true;
    stopButton.disabled = false;
    downloadButton.disabled = results.length === 0;
    results.length = 0;
    clearNode(list);

    for (const [index, prompt] of corpus.prompts.entries()) {
      if (stopRequested) break;
      progress.textContent = `Running ${prompt.id} (${index + 1} of ${corpus.prompts.length})…`;
      const row = element("li", `${prompt.id}: running…`);
      list.append(row);
      const started = performance.now();

      try {
        prepareForm(prompt.input);
        $("concept-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        const outcome = await waitForUiOutcome(190_000);
        const durationMs = Math.round(performance.now() - started);

        if (outcome === "failure") {
          const visible = $("fatal-detail")?.textContent || "UI run failed";
          results.push({
            promptId: prompt.id,
            durationMs,
            repairUsed: false,
            error: {
              category: classifyVisibleError(visible),
              name: "ui_run_failed",
            },
          });
          row.textContent = `${prompt.id}: FAIL (${classifyVisibleError(visible)})`;
          resetUiAfterFailure();
        } else {
          const project = await readCurrentProject(anna);
          const validationErrors = validateProject(project);
          const inputErrors = compareInput(project, prompt.input);
          if (validationErrors.length || inputErrors.length) {
            results.push({
              promptId: prompt.id,
              durationMs,
              repairUsed: project?.metadata?.repairUsed === true,
              error: {
                category: "contract",
                name: validationErrors.length ? "contract_invalid" : "input_mismatch",
              },
            });
            row.textContent = `${prompt.id}: FAIL (contract)`;
          } else {
            results.push({
              promptId: prompt.id,
              durationMs,
              repairUsed: project?.metadata?.repairUsed === true,
              project,
            });
            row.textContent = `${prompt.id}: PASS${project?.metadata?.repairUsed ? " after repair" : ""} (${formatDuration(durationMs)})`;
          }
          resetUiAfterSuccess();
        }
      } catch (error) {
        const durationMs = Math.round(performance.now() - started);
        const category = /timeout/i.test(error?.message || "") ? "timeout" : "runtime";
        results.push({
          promptId: prompt.id,
          durationMs,
          repairUsed: false,
          error: { category, name: category === "timeout" ? "timeout" : "collector_error" },
        });
        row.textContent = `${prompt.id}: FAIL (${category})`;
        resetUiAfterFailure();
      }

      counters.textContent = `${results.length} / ${corpus.prompts.length} complete`;
      downloadButton.disabled = results.length === 0;
    }

    running = false;
    stopButton.disabled = true;
    runButton.disabled = !consent.checked;
    const passes = results.filter((entry) => entry.project).length;
    const repaired = results.filter((entry) => entry.repairUsed).length;
    progress.textContent = stopRequested
      ? `Stopped with ${passes}/${results.length} completed runs passing. Download the partial JSONL.`
      : `Finished: ${passes}/${corpus.prompts.length} passed; ${repaired} used repair. Download the JSONL, then run npm run acceptance:evaluate.`;
  });
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
      if (performance.now() - started >= timeoutMs) return reject(new Error("Acceptance prompt timed out."));
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
  if (Number(identity.durationMinutes) !== Number(input.durationMinutes)) errors.push("durationMinutes");
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
  if (value.includes("json") || value.includes("validation") || value.includes("contract")) return "contract";
  return "unknown";
}

function downloadJsonl(results) {
  if (!results.length) return;
  const text = `${results.map((entry) => JSON.stringify(entry)).join("\n")}\n`;
  const blob = new Blob([text], { type: "application/x-ndjson" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `storycore-harbour-acceptance-${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`;
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
  while (node.firstChild) node.removeChild(node.firstChild);
}

function formatDuration(ms) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function safeText(value) {
  return String(value || "unknown").replace(/[\r\n]+/g, " ").slice(0, 180);
}

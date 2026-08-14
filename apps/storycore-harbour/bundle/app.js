import { PROJECT_SCHEMA, validateProject } from "./project-contract.js";

const AnnaAppRuntime = window.__STORYCORE_HARBOUR_RUNTIME__?.AnnaAppRuntime;
if (!AnnaAppRuntime) {
  throw new Error("StoryCore Harbour could not initialize the Anna runtime bridge.");
}

const STORAGE_CURRENT = "projects/current";
const MAX_MODEL_RESPONSE_CHARS = 28_000;
const $ = (id) => document.getElementById(id);
const state = {
  anna: null,
  project: null,
  running: false,
  runtimeMode: "connecting",
};

const SYSTEM_PROMPT = `You are StoryCore Harbour, a professional visual-story production planner.
Return ONLY one valid JSON object. Never use Markdown or code fences.
The JSON must use schemaVersion "${PROJECT_SCHEMA}" and contain:
- project: id, title, language, format, durationMinutes, audience, tone, sourceIdea, createdAt, updatedAt
- productionBible: logline, synopsis, themes[], visualDirection {style,palette[],lighting,cameraLanguage}, continuityRules[]
- characters[]: id,name,role,goal,conflict,visualIdentity,continuityRules[]
- locations[]: id,name,purpose,visualIdentity,continuityRules[]
- scenes[]: id,order,title,purpose,locationId,characterIds[],durationSeconds,shots[]
- each shot: id,order,framing,camera,action,dialogue,sound,characterIds[],generationPrompt
- continuityReport: score (0-100), warnings[] {severity,message,sceneId|null}, checkedAt
Create 3-5 scenes and 1-3 shots per scene, proportionate to the requested duration.
Use unique stable IDs. Every reference must point to a declared character, location, or scene.
Characters in a shot must also be listed in the parent scene.
Keep visual identities and continuity rules explicit and stable.
The sum of scene durations must plausibly match the requested project duration.
Write all human-facing content in the requested language.
If input.title is non-empty, copy it exactly to project.title.
Do not claim to generate images, audio, or video.`;

const annaReady = connectToAnna();

async function connectToAnna() {
  try {
    const anna = await AnnaAppRuntime.connect();
    state.anna = anna;
    state.runtimeMode = "anna";
    await anna.window.set_title({ title: "StoryCore Harbour" }).catch(() => undefined);
    setRuntimeStatus("Connected to Anna", "ready");
    return anna;
  } catch {
    state.runtimeMode = "offline";
    setRuntimeStatus("Local preview mode", "offline");
    console.warn("[storycore-harbour] Anna runtime unavailable; using local preview mode.");
    return null;
  }
}

function setRuntimeStatus(text, className = "") {
  const node = $("runtime-status");
  node.textContent = text;
  node.className = `status ${className}`.trim();
}

function setBusy(busy, detail = "Structuring the world, scenes, shots, and continuity.") {
  state.running = busy;
  $("generate-button").disabled = busy;
  $("load-button").disabled = busy;
  $("run-progress").hidden = !busy;
  $("progress-detail").textContent = detail;
  if (busy) $("step-1").hidden = true;
}

function showFormError(message = "") {
  const node = $("form-error");
  node.textContent = message;
  node.hidden = !message;
  if (message) {
    node.focus({ preventScroll: true });
    node.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

function showFatal(title, detail) {
  setBusy(false);
  document.querySelectorAll(".step-panel").forEach((panel) => {
    panel.hidden = true;
  });
  $("fatal-title").textContent = title;
  $("fatal-detail").textContent = detail;
  $("fatal-error").hidden = false;
}

function errorName(error) {
  return error?.name || error?.error?.name || error?.code || error?.error?.code || "";
}

function errorMessage(error) {
  return error?.message || error?.error?.message || String(error);
}

function normalizeError(error) {
  const name = String(errorName(error));
  const message = errorMessage(error);
  if (name === "APP_QUOTA_EXCEEDED" || name === "quota_exceeded") {
    return "Your Anna model or storage quota is currently exhausted. Review your quota, then retry.";
  }
  if (name === "APP_NOT_GRANTED" || name === "permission_denied" || name === "not_granted") {
    return "StoryCore Harbour does not currently have permission to use this Anna capability.";
  }
  if (name === "APP_PROVIDER_ERROR") {
    return "The selected model provider failed to complete the request. Retry once or choose another enabled provider in Anna.";
  }
  if (name === "precondition_failed") {
    return "This project changed in another StoryCore Harbour window. Reload the latest project before saving again.";
  }
  if (name === "invalid_path" || name === "invalid_arg") {
    return "Anna rejected an internal project storage request. The project was not overwritten.";
  }
  if (/timeout/i.test(name) || /timeout/i.test(message)) {
    return "The generation timed out before a complete project was returned.";
  }
  return message;
}

function readForm() {
  const input = {
    idea: $("idea").value.trim(),
    title: $("title").value.trim(),
    format: $("format").value,
    durationMinutes: Number($("duration").value),
    language: $("language").value,
    tone: $("tone").value.trim(),
    audience: $("audience").value.trim(),
  };
  const errors = [];
  if (input.idea.length < 20) errors.push("Describe the concept in at least 20 characters.");
  if (input.idea.length > 12_000) errors.push("The concept is too long for this version.");
  if (!Number.isFinite(input.durationMinutes) || input.durationMinutes < 0.25 || input.durationMinutes > 240) {
    errors.push("Choose a duration between 0.25 and 240 minutes.");
  }
  if (!input.tone || input.tone.length > 240) errors.push("Add a tone or visual style under 240 characters.");
  if (!input.audience || input.audience.length > 240) errors.push("Add an intended audience under 240 characters.");
  if (input.title.length > 160) errors.push("The working title must not exceed 160 characters.");
  return { input, errors };
}

function createUserPrompt(input) {
  return JSON.stringify({
    task: "Build a complete StoryCore Harbour production package.",
    input,
    constraints: {
      schemaVersion: PROJECT_SCHEMA,
      jsonOnly: true,
      noMediaGenerationClaims: true,
      minScenes: 3,
      maxScenes: 5,
      minShotsPerScene: 1,
      maxShotsPerScene: 3,
    },
  });
}

function responseText(response) {
  if (typeof response === "string") return response;
  if (typeof response?.content === "string") return response.content;
  if (typeof response?.content?.text === "string") return response.content.text;
  if (Array.isArray(response?.content)) {
    return response.content.map((item) => item?.text || "").join("");
  }
  throw new Error("The model returned an unsupported response shape.");
}

function stripOptionalJsonFence(value) {
  if (!value.startsWith("```") || !value.endsWith("```")) return value;
  const firstLineEnd = value.indexOf("\n");
  if (firstLineEnd < 0) return value;

  const openingFence = value.slice(0, firstLineEnd).trim().toLowerCase();
  if (openingFence !== "```" && openingFence !== "```json") return value;
  return value.slice(firstLineEnd + 1, -3).trim();
}

function parseJsonText(text) {
  let value = String(text || "").trim();
  if (value.length > MAX_MODEL_RESPONSE_CHARS) {
    throw new Error(`The model response exceeded ${MAX_MODEL_RESPONSE_CHARS.toLocaleString()} characters.`);
  }
  value = stripOptionalJsonFence(value);
  return JSON.parse(value);
}

function localRunMetadata() {
  const now = new Date().toISOString();
  return {
    id: globalThis.crypto?.randomUUID?.() || `harbour-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  };
}

function objectRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function addLocalMetadata(project, input, metadata, repairUsed = false) {
  if (!project || typeof project !== "object" || Array.isArray(project)) return project;
  project.schemaVersion = PROJECT_SCHEMA;
  project.project = {
    ...objectRecord(project.project),
    id: metadata.id,
    title: input.title || project.project?.title || "Untitled visual story",
    language: input.language,
    format: input.format,
    durationMinutes: input.durationMinutes,
    audience: input.audience,
    tone: input.tone,
    sourceIdea: input.idea,
    createdAt: metadata.createdAt,
    updatedAt: metadata.updatedAt,
  };
  project.continuityReport = {
    ...objectRecord(project.continuityReport),
    checkedAt: metadata.updatedAt,
  };
  project.metadata = {
    ...objectRecord(project.metadata),
    generator: "storycore-harbour",
    generatedAt: metadata.updatedAt,
    runtime: state.runtimeMode,
    repairUsed,
  };
  return project;
}

async function modelComplete(messages, systemPrompt = SYSTEM_PROMPT) {
  const anna = await annaReady;
  if (!anna) {
    throw new Error("Anna runtime is unavailable. Open StoryCore Harbour inside Anna or run its official mock harness.");
  }
  return anna.llm.complete(
    {
      messages,
      systemPrompt,
      maxTokens: 4096,
      temperature: 0.3,
    },
    { timeoutMs: 180_000 },
  );
}

async function generateProject(input) {
  const metadata = localRunMetadata();
  const request = [{ role: "user", content: { type: "text", text: createUserPrompt(input) } }];
  const first = await modelComplete(request);
  let raw = responseText(first);
  let project;
  let errors;

  try {
    project = addLocalMetadata(parseJsonText(raw), input, metadata, false);
    errors = validateProject(project);
  } catch (error) {
    errors = [`JSON parse failed: ${error.message}`];
  }

  if (!errors.length) return project;

  setBusy(true, "Repairing the structured result after contract validation…");
  const repairPrompt = `Repair the previous response so it becomes exactly one JSON object matching StoryCore Harbour's required contract.
Return JSON only. Preserve useful creative content. Correct every listed error. Do not add commentary.

VALIDATION ERRORS:
${errors.map((error) => `- ${error}`).join("\n")}

PREVIOUS RESPONSE:
${raw.slice(0, 22_000)}`;

  const repaired = await modelComplete([
    { role: "user", content: { type: "text", text: repairPrompt } },
  ]);
  raw = responseText(repaired);
  project = addLocalMetadata(parseJsonText(raw), input, metadata, true);
  errors = validateProject(project);
  if (errors.length) {
    throw new Error(`The repaired project still failed validation: ${errors.join(" ")}`);
  }
  return project;
}

async function writeAnnaValue(anna, key, value) {
  const current = await anna.storage.get({ key });
  const args = { key, value };
  if (current?.exists && current.etag) args.if_match = current.etag;
  return anna.storage.set(args);
}

async function saveProject(project) {
  const errors = validateProject(project);
  if (errors.length) throw new Error(`Refusing to save an invalid project: ${errors.join(" ")}`);

  const anna = await annaReady;
  if (anna) {
    const snapshotKey = `projects/by-id/${project.project.id}`;
    await writeAnnaValue(anna, snapshotKey, project);
    await writeAnnaValue(anna, STORAGE_CURRENT, project);

    const readBack = await anna.storage.get({ key: STORAGE_CURRENT });
    if (!readBack?.exists) throw new Error("Anna storage did not return the project after saving it.");
    const readBackErrors = validateProject(readBack.value);
    if (readBackErrors.length) {
      throw new Error(`The saved project failed read-back validation: ${readBackErrors.join(" ")}`);
    }
    return "Saved and verified in your Anna App storage.";
  }

  localStorage.setItem(STORAGE_CURRENT, JSON.stringify(project));
  const readBack = JSON.parse(localStorage.getItem(STORAGE_CURRENT));
  const readBackErrors = validateProject(readBack);
  if (readBackErrors.length) throw new Error(`Local preview save verification failed: ${readBackErrors.join(" ")}`);
  return "Saved and verified in this browser's local preview storage.";
}

async function loadCurrentProject() {
  const anna = await annaReady;
  if (anna) {
    const result = await anna.storage.get({ key: STORAGE_CURRENT });
    if (!result?.exists) throw new Error("No saved StoryCore Harbour project was found.");
    return result.value;
  }
  const stored = localStorage.getItem(STORAGE_CURRENT);
  if (!stored) throw new Error("No local preview project was found.");
  return JSON.parse(stored);
}

function clearNode(node) {
  while (node.firstChild) node.firstChild.remove();
}

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = String(text);
  if (className) node.className = className;
  return node;
}

function addDefinition(card, label, value) {
  const list = card.querySelector("dl") || card.appendChild(element("dl"));
  list.append(element("dt", label), element("dd", value || "—"));
}

function renderBible(project) {
  const bible = project.productionBible;
  $("world-title").textContent = project.project.title;
  clearNode($("bible-content"));

  const bibleGrid = element("div", null, "bible-grid");
  const storyCard = element("article", null, "card");
  storyCard.append(element("h3", "Story"));
  addDefinition(storyCard, "Logline", bible.logline);
  addDefinition(storyCard, "Synopsis", bible.synopsis);
  addDefinition(storyCard, "Themes", bible.themes.join(" · "));

  const visualCard = element("article", null, "card");
  visualCard.append(element("h3", "Visual direction"));
  addDefinition(visualCard, "Style", bible.visualDirection.style);
  addDefinition(visualCard, "Palette", bible.visualDirection.palette.join(" · "));
  addDefinition(visualCard, "Lighting", bible.visualDirection.lighting);
  addDefinition(visualCard, "Camera language", bible.visualDirection.cameraLanguage);
  addDefinition(visualCard, "Continuity rules", bible.continuityRules.join(" · "));

  bibleGrid.append(storyCard, visualCard);
  $("bible-content").append(bibleGrid);
}

function renderCharacters(characters) {
  const container = $("character-list");
  clearNode(container);
  for (const character of characters) {
    const card = element("article", null, "card");
    card.append(element("h4", character.name));
    addDefinition(card, "Role", character.role);
    addDefinition(card, "Goal", character.goal);
    addDefinition(card, "Conflict", character.conflict);
    addDefinition(card, "Visual identity", character.visualIdentity);
    addDefinition(card, "Continuity", character.continuityRules.join(" · "));
    container.append(card);
  }
}

function renderLocations(locations) {
  const container = $("location-list");
  clearNode(container);
  for (const location of locations) {
    const card = element("article", null, "card");
    card.append(element("h4", location.name));
    addDefinition(card, "Purpose", location.purpose);
    addDefinition(card, "Visual identity", location.visualIdentity);
    addDefinition(card, "Continuity", location.continuityRules.join(" · "));
    container.append(card);
  }
}

function renderShot(shot, characterNames) {
  const shotCard = element("div", null, "shot");
  shotCard.append(element("h4", `Shot ${shot.order} · ${shot.framing}`));
  shotCard.append(element("p", `Camera: ${shot.camera}`));
  shotCard.append(element("p", `Action: ${shot.action}`));
  if (shot.dialogue) shotCard.append(element("p", `Dialogue: ${shot.dialogue}`));
  if (shot.sound) shotCard.append(element("p", `Sound: ${shot.sound}`));

  const names = shot.characterIds.map((id) => characterNames.get(id));
  if (names.length) shotCard.append(element("p", `Characters: ${names.join(", ")}`));
  shotCard.append(element("div", shot.generationPrompt, "prompt"));
  return shotCard;
}

function renderScene(scene, characterNames, locationNames) {
  const card = element("article", null, "scene");
  card.append(element("p", `SCENE ${scene.order}`, "eyebrow"), element("h3", scene.title));
  card.append(
    element("p", `${locationNames.get(scene.locationId)} · ${scene.durationSeconds}s`, "scene-meta"),
    element("p", scene.purpose),
  );

  const shots = element("div", null, "shots");
  for (const shot of [...scene.shots].sort((left, right) => left.order - right.order)) {
    shots.append(renderShot(shot, characterNames));
  }
  card.append(shots);
  return card;
}

function renderScenes(project) {
  const container = $("scene-list");
  clearNode(container);
  const characterNames = new Map(project.characters.map((item) => [item.id, item.name]));
  const locationNames = new Map(project.locations.map((item) => [item.id, item.name]));
  for (const scene of [...project.scenes].sort((left, right) => left.order - right.order)) {
    container.append(renderScene(scene, characterNames, locationNames));
  }
}

function renderContinuity(report) {
  const container = $("continuity-content");
  clearNode(container);
  const summary = element("div", null, "bible-grid");
  summary.append(element("div", Math.round(report.score), "score"));

  const warningCard = element("article", null, "card");
  warningCard.append(element("h3", report.warnings.length ? "Continuity notes" : "Continuity clear"));
  if (report.warnings.length) {
    const list = element("ul");
    for (const warning of report.warnings) {
      list.append(element("li", `${warning.severity.toUpperCase()}: ${warning.message}`));
    }
    warningCard.append(list);
  } else {
    warningCard.append(element("p", "No continuity warning was reported by this run."));
  }

  summary.append(warningCard);
  container.append(summary);
}

function renderProject(project) {
  const errors = validateProject(project);
  if (errors.length) throw new Error(`Cannot render an invalid project: ${errors.join(" ")}`);
  state.project = project;

  renderBible(project);
  renderCharacters(project.characters);
  renderLocations(project.locations);
  renderScenes(project);
  renderContinuity(project.continuityReport);
  $("save-status").textContent = "Project validated. Save or export it.";
  unlockSteps();
  showStep(2);
}

function resetProjectUi() {
  state.project = null;
  $("concept-form").reset();
  $("idea").dispatchEvent(new Event("input", { bubbles: true }));
  showFormError();

  $("world-title").textContent = "Production bible";
  for (const id of [
    "bible-content",
    "character-list",
    "location-list",
    "scene-list",
    "continuity-content",
  ]) {
    clearNode($(id));
  }
  $("save-status").textContent = "";

  document.querySelectorAll(".step").forEach((button, index) => {
    button.disabled = index > 0;
  });
  showStep(1);

  requestAnimationFrame(() => {
    $("idea").focus({ preventScroll: true });
    $("idea").scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
}

function unlockSteps() {
  document.querySelectorAll(".step").forEach((button) => {
    button.disabled = false;
  });
}

function showStep(number) {
  $("fatal-error").hidden = true;
  document.querySelectorAll(".step-panel").forEach((panel) => {
    panel.hidden = panel.id !== `step-${number}`;
  });
  document.querySelectorAll(".step").forEach((button) => {
    const active = Number(button.dataset.step) === Number(number);
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "step");
    else button.removeAttribute("aria-current");
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function exportProject() {
  if (!state.project) return;
  const safeName = (state.project.project.title || "storycore-harbour")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase() || "storycore-harbour";
  const blob = new Blob([JSON.stringify(state.project, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeName}.storycore-harbour.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

$("idea").addEventListener("input", () => {
  $("idea-count").textContent = `${$("idea").value.length.toLocaleString()} / 12,000`;
});

$("concept-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (state.running) return;
  const { input, errors } = readForm();
  showFormError(errors.join(" "));
  if (errors.length) return;

  try {
    setBusy(true);
    const project = await generateProject(input);
    const statusText = await saveProject(project);
    setBusy(false);
    renderProject(project);
    $("save-status").textContent = statusText;
  } catch (error) {
    showFatal("The project could not be completed", normalizeError(error));
  }
});

$("load-button").addEventListener("click", async () => {
  try {
    const project = await loadCurrentProject();
    const errors = validateProject(project);
    if (errors.length) throw new Error(`The saved project is invalid: ${errors.join(" ")}`);
    renderProject(project);
    $("save-status").textContent = "Latest saved project loaded and verified.";
  } catch (error) {
    showFormError(normalizeError(error));
  }
});

$("save-button").addEventListener("click", async () => {
  try {
    $("save-status").textContent = await saveProject(state.project);
  } catch (error) {
    $("save-status").textContent = normalizeError(error);
  }
});

$("export-button").addEventListener("click", exportProject);
$("new-button").addEventListener("click", resetProjectUi);
$("retry-button").addEventListener("click", () => showStep(1));

document.querySelectorAll(".step").forEach((button) => {
  button.addEventListener("click", () => {
    if (!button.disabled) showStep(Number(button.dataset.step));
  });
});

document.querySelectorAll(".next-button").forEach((button) => {
  button.addEventListener("click", () => showStep(Number(button.dataset.next)));
});

await annaReady;

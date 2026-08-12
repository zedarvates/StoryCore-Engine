import { AnnaAppRuntime } from "/static/anna-apps/_sdk/latest/index.js";

const PROJECT_SCHEMA = "storycore-harbour.project.v1";
const STORAGE_CURRENT = "projects/current";
const $ = (id) => document.getElementById(id);
const state = { anna: null, project: null, lastInput: null, running: false, runtimeMode: "connecting" };

const SYSTEM_PROMPT = `You are StoryCore Harbour, a professional visual-story production planner.
Return ONLY one valid JSON object. Do not use Markdown or code fences.
The JSON must use schemaVersion "${PROJECT_SCHEMA}" and contain:
- project: id, title, language, format, durationMinutes, audience, tone, sourceIdea, createdAt, updatedAt
- productionBible: logline, synopsis, themes[], visualDirection {style,palette[],lighting,cameraLanguage}, continuityRules[]
- characters[]: id,name,role,goal,conflict,visualIdentity,continuityRules[]
- locations[]: id,name,purpose,visualIdentity,continuityRules[]
- scenes[]: id,order,title,purpose,locationId,characterIds[],durationSeconds,shots[]
- each shot: id,order,framing,camera,action,dialogue,sound,characterIds[],generationPrompt
- continuityReport: score (0-100), warnings[] {severity,message,sceneId|null}, checkedAt
Create 3-6 scenes and 1-4 shots per scene, proportionate to duration.
All scene/shot character IDs and location IDs must reference declared entities.
Keep stable visual identities and explicit continuity rules.
Do not claim to generate images, audio, or video.`;

const annaReady = (async () => {
  try {
    const anna = await AnnaAppRuntime.connect();
    state.anna = anna;
    state.runtimeMode = "anna";
    await anna.window.set_title({ title: "StoryCore Harbour" }).catch(() => {});
    setRuntimeStatus("Connected to Anna", "ready");
    return anna;
  } catch (error) {
    state.runtimeMode = "offline";
    setRuntimeStatus("Local preview mode", "offline");
    console.warn("Anna runtime unavailable; local preview remains available.", error);
    return null;
  }
})();

function setRuntimeStatus(text, className) {
  const el = $("runtime-status");
  el.textContent = text;
  el.className = `status ${className || ""}`;
}

function setBusy(busy) {
  state.running = busy;
  $("generate-button").disabled = busy;
  $("load-button").disabled = busy;
  $("run-progress").hidden = !busy;
  $("step-1").hidden = busy;
}

function showFormError(message) {
  const el = $("form-error");
  el.textContent = message;
  el.hidden = !message;
}

function showFatal(title, detail) {
  setBusy(false);
  document.querySelectorAll(".step-panel").forEach((el) => { el.hidden = true; });
  $("fatal-title").textContent = title;
  $("fatal-detail").textContent = detail;
  $("fatal-error").hidden = false;
}

function normalizeError(error) {
  const name = error?.name || error?.error?.name || "";
  const message = error?.message || error?.error?.message || String(error);
  if (name === "APP_QUOTA_EXCEEDED") return "Your Anna model quota is currently exhausted. Review the quota in Anna, then retry.";
  if (name === "APP_NOT_GRANTED" || name === "permission_denied") return "StoryCore Harbour does not currently have permission to use this Anna capability.";
  if (name === "APP_PROVIDER_ERROR") return "The selected model provider failed to complete the request. Retry once or choose another enabled provider in Anna.";
  if (/timeout/i.test(message)) return "The generation timed out before a complete project was returned.";
  return message;
}

function readForm() {
  const idea = $("idea").value.trim();
  const durationMinutes = Number($("duration").value);
  const input = {
    idea,
    title: $("title").value.trim(),
    format: $("format").value,
    durationMinutes,
    language: $("language").value,
    tone: $("tone").value.trim(),
    audience: $("audience").value.trim(),
  };
  const errors = [];
  if (idea.length < 20) errors.push("Describe the concept in at least 20 characters.");
  if (idea.length > 12000) errors.push("The concept is too long for this version.");
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0 || durationMinutes > 240) errors.push("Choose a duration between 0.25 and 240 minutes.");
  if (!input.tone) errors.push("Add a tone or visual style.");
  if (!input.audience) errors.push("Add an intended audience.");
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
      maxScenes: 6,
      maxShotsPerScene: 4,
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

function parseJsonText(text) {
  let value = String(text || "").trim();
  const fence = value.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) value = fence[1].trim();
  return JSON.parse(value);
}

function validateProject(project) {
  const errors = [];
  const object = (v) => v && typeof v === "object" && !Array.isArray(v);
  const text = (v) => typeof v === "string" && v.trim();
  if (!object(project)) return ["Project must be an object."];
  if (project.schemaVersion !== PROJECT_SCHEMA) errors.push(`schemaVersion must be ${PROJECT_SCHEMA}.`);
  if (!object(project.project)) errors.push("project is required.");
  if (!object(project.productionBible)) errors.push("productionBible is required.");
  if (!Array.isArray(project.characters) || project.characters.length < 1) errors.push("At least one character is required.");
  if (!Array.isArray(project.locations) || project.locations.length < 1) errors.push("At least one location is required.");
  if (!Array.isArray(project.scenes) || project.scenes.length < 1) errors.push("At least one scene is required.");
  if (!object(project.continuityReport)) errors.push("continuityReport is required.");

  const characterIds = new Set((project.characters || []).map((item) => item?.id).filter(Boolean));
  const locationIds = new Set((project.locations || []).map((item) => item?.id).filter(Boolean));
  const seen = new Set();
  for (const scene of project.scenes || []) {
    if (!text(scene?.id)) errors.push("Every scene requires an id.");
    if (seen.has(scene?.id)) errors.push(`Duplicate scene id ${scene.id}.`);
    seen.add(scene?.id);
    if (!locationIds.has(scene?.locationId)) errors.push(`Scene ${scene?.id || "unknown"} has an unknown location.`);
    for (const id of scene?.characterIds || []) if (!characterIds.has(id)) errors.push(`Scene ${scene?.id || "unknown"} has an unknown character.`);
    if (!Array.isArray(scene?.shots) || scene.shots.length < 1) errors.push(`Scene ${scene?.id || "unknown"} requires at least one shot.`);
    for (const shot of scene?.shots || []) {
      if (!text(shot?.generationPrompt)) errors.push(`Shot ${shot?.id || "unknown"} requires a generation prompt.`);
      for (const id of shot?.characterIds || []) if (!characterIds.has(id)) errors.push(`Shot ${shot?.id || "unknown"} has an unknown character.`);
    }
  }
  const score = Number(project.continuityReport?.score);
  if (!Number.isFinite(score) || score < 0 || score > 100) errors.push("Continuity score must be between 0 and 100.");
  return [...new Set(errors)];
}

function addLocalMetadata(project, input) {
  const now = new Date().toISOString();
  const id = project?.project?.id || crypto.randomUUID?.() || `harbour-${Date.now()}`;
  project.schemaVersion = PROJECT_SCHEMA;
  project.project = {
    ...project.project,
    id,
    title: project.project?.title || input.title || "Untitled visual story",
    language: input.language,
    format: input.format,
    durationMinutes: input.durationMinutes,
    audience: input.audience,
    tone: input.tone,
    sourceIdea: input.idea,
    createdAt: project.project?.createdAt || now,
    updatedAt: now,
  };
  project.continuityReport = {
    ...project.continuityReport,
    checkedAt: project.continuityReport?.checkedAt || now,
  };
  project.metadata = {
    ...project.metadata,
    generator: "storycore-harbour",
    generatedAt: now,
    runtime: state.runtimeMode,
  };
  return project;
}

async function modelComplete(messages, systemPrompt = SYSTEM_PROMPT) {
  const anna = await annaReady;
  if (!anna) throw new Error("Anna runtime is unavailable. Run the mock harness or open the App inside Anna.");
  return anna.llm.complete({
    messages,
    systemPrompt,
    maxTokens: 4096,
    temperature: 0.35,
    modelPreferences: { intelligencePriority: 0.75, speedPriority: 0.6, costPriority: 0.5 },
  }, { timeoutMs: 180000 });
}

async function generateProject(input) {
  const first = await modelComplete([{ role: "user", content: { type: "text", text: createUserPrompt(input) } }]);
  let raw = responseText(first);
  let project;
  let errors;
  try {
    project = addLocalMetadata(parseJsonText(raw), input);
    errors = validateProject(project);
  } catch (error) {
    errors = [`JSON parse failed: ${error.message}`];
  }
  if (!errors.length) return project;

  $("progress-detail").textContent = "Repairing the structured result after validation…";
  const repairPrompt = `Repair the following response so it becomes one valid JSON object matching the required StoryCore Harbour schema.
Return JSON only. Preserve useful content. Correct every listed error.

ERRORS:
${errors.map((error) => `- ${error}`).join("\n")}

PREVIOUS RESPONSE:
${raw.slice(0, 24000)}`;

  const repaired = await modelComplete([{ role: "user", content: { type: "text", text: repairPrompt } }]);
  raw = responseText(repaired);
  project = addLocalMetadata(parseJsonText(raw), input);
  errors = validateProject(project);
  if (errors.length) throw new Error(`The repaired project still failed validation: ${errors.join(" ")}`);
  return project;
}

async function saveProject(project) {
  const errors = validateProject(project);
  if (errors.length) throw new Error(`Refusing to save an invalid project: ${errors.join(" ")}`);
  const anna = await annaReady;
  if (anna) {
    await anna.storage.set({ key: `projects/by-id/${project.project.id}`, value: project });
    await anna.storage.set({ key: STORAGE_CURRENT, value: project });
    return "Saved securely in your Anna App storage.";
  }
  localStorage.setItem(STORAGE_CURRENT, JSON.stringify(project));
  return "Saved in this browser's local preview storage.";
}

async function loadCurrent() {
  const anna = await annaReady;
  if (anna) {
    const result = await anna.storage.get({ key: STORAGE_CURRENT });
    if (!result?.exists) throw new Error("No saved StoryCore Harbour project was found.");
    return result.value;
  }
  const value = localStorage.getItem(STORAGE_CURRENT);
  if (!value) throw new Error("No local preview project was found.");
  return JSON.parse(value);
}

function clearNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = String(text);
  if (className) node.className = className;
  return node;
}

function addDefinition(card, label, value) {
  const dl = card.querySelector("dl") || card.appendChild(el("dl"));
  dl.append(el("dt", label), el("dd", value || "—"));
}

function renderProject(project) {
  state.project = project;
  const bible = project.productionBible;
  $("world-title").textContent = project.project.title;
  clearNode($("bible-content"));
  const bibleGrid = el("div", null, "bible-grid");
  const storyCard = el("article", null, "card");
  storyCard.append(el("h3", "Story"));
  addDefinition(storyCard, "Logline", bible.logline);
  addDefinition(storyCard, "Synopsis", bible.synopsis);
  addDefinition(storyCard, "Themes", (bible.themes || []).join(" · "));
  const visualCard = el("article", null, "card");
  visualCard.append(el("h3", "Visual direction"));
  addDefinition(visualCard, "Style", bible.visualDirection?.style);
  addDefinition(visualCard, "Palette", (bible.visualDirection?.palette || []).join(" · "));
  addDefinition(visualCard, "Lighting", bible.visualDirection?.lighting);
  addDefinition(visualCard, "Camera language", bible.visualDirection?.cameraLanguage);
  addDefinition(visualCard, "Continuity rules", (bible.continuityRules || []).join(" · "));
  bibleGrid.append(storyCard, visualCard);
  $("bible-content").append(bibleGrid);

  clearNode($("character-list"));
  for (const character of project.characters) {
    const card = el("article", null, "card");
    card.append(el("h4", character.name));
    addDefinition(card, "Role", character.role);
    addDefinition(card, "Goal", character.goal);
    addDefinition(card, "Conflict", character.conflict);
    addDefinition(card, "Visual identity", character.visualIdentity);
    addDefinition(card, "Continuity", (character.continuityRules || []).join(" · "));
    $("character-list").append(card);
  }

  clearNode($("location-list"));
  for (const location of project.locations) {
    const card = el("article", null, "card");
    card.append(el("h4", location.name));
    addDefinition(card, "Purpose", location.purpose);
    addDefinition(card, "Visual identity", location.visualIdentity);
    addDefinition(card, "Continuity", (location.continuityRules || []).join(" · "));
    $("location-list").append(card);
  }

  clearNode($("scene-list"));
  const characterMap = new Map(project.characters.map((item) => [item.id, item.name]));
  const locationMap = new Map(project.locations.map((item) => [item.id, item.name]));
  for (const scene of [...project.scenes].sort((a, b) => a.order - b.order)) {
    const card = el("article", null, "scene");
    card.append(el("p", `SCENE ${scene.order}`, "eyebrow"), el("h3", scene.title));
    card.append(el("p", `${locationMap.get(scene.locationId) || scene.locationId} · ${scene.durationSeconds}s`, "scene-meta"));
    card.append(el("p", scene.purpose));
    const shots = el("div", null, "shots");
    for (const shot of [...scene.shots].sort((a, b) => a.order - b.order)) {
      const shotCard = el("div", null, "shot");
      shotCard.append(el("h4", `Shot ${shot.order} · ${shot.framing}`));
      shotCard.append(el("p", `Camera: ${shot.camera}`));
      shotCard.append(el("p", `Action: ${shot.action}`));
      if (shot.dialogue) shotCard.append(el("p", `Dialogue: ${shot.dialogue}`));
      if (shot.sound) shotCard.append(el("p", `Sound: ${shot.sound}`));
      const names = (shot.characterIds || []).map((id) => characterMap.get(id) || id);
      if (names.length) shotCard.append(el("p", `Characters: ${names.join(", ")}`));
      shotCard.append(el("div", shot.generationPrompt, "prompt"));
      shots.append(shotCard);
    }
    card.append(shots);
    $("scene-list").append(card);
  }

  clearNode($("continuity-content"));
  const report = project.continuityReport;
  const summary = el("div", null, "bible-grid");
  summary.append(el("div", Math.round(report.score), "score"));
  const warnings = el("article", null, "card");
  warnings.append(el("h3", report.warnings?.length ? "Continuity notes" : "Continuity clear"));
  if (report.warnings?.length) {
    const list = el("ul");
    for (const warning of report.warnings) list.append(el("li", `${warning.severity.toUpperCase()}: ${warning.message}`));
    warnings.append(list);
  } else {
    warnings.append(el("p", "No continuity warning was reported by this run."));
  }
  summary.append(warnings);
  $("continuity-content").append(summary);
  $("save-status").textContent = "Project validated. Save or export it.";
  unlockSteps();
  showStep(2);
}

function unlockSteps() {
  document.querySelectorAll(".step").forEach((button) => { button.disabled = false; });
}

function showStep(number) {
  $("fatal-error").hidden = true;
  document.querySelectorAll(".step-panel").forEach((panel) => { panel.hidden = panel.id !== `step-${number}`; });
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
  const safe = (state.project.project.title || "storycore-harbour")
    .normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "storycore-harbour";
  const blob = new Blob([JSON.stringify(state.project, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safe}.storycore-harbour.json`;
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
  state.lastInput = input;
  try {
    setBusy(true);
    $("progress-detail").textContent = "Structuring the world, scenes, shots, and continuity.";
    const project = await generateProject(input);
    const message = await saveProject(project);
    setBusy(false);
    renderProject(project);
    $("save-status").textContent = message;
  } catch (error) {
    showFatal("The project could not be completed", normalizeError(error));
  }
});

$("load-button").addEventListener("click", async () => {
  try {
    const project = await loadCurrent();
    const errors = validateProject(project);
    if (errors.length) throw new Error(`The saved project is invalid: ${errors.join(" ")}`);
    renderProject(project);
    $("save-status").textContent = "Latest saved project loaded.";
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
$("new-button").addEventListener("click", () => {
  state.project = null;
  document.querySelectorAll(".step").forEach((button, index) => { button.disabled = index > 0; });
  showStep(1);
});
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

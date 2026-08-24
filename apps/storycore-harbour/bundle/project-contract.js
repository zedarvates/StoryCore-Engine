export const PROJECT_SCHEMA = "storycore-harbour.project.v1";

export const SUPPORTED_FORMATS = new Set([
  "short-film",
  "advertisement",
  "music-video",
  "documentary",
  "comic-webtoon",
  "social-video",
]);

const WARNING_SEVERITIES = new Set(["info", "warning", "error"]);
const WARNING_SEVERITY_ALIASES = new Map([
  ["low", "info"],
  ["minor", "info"],
  ["medium", "warning"],
  ["high", "error"],
]);

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isText = (value, min = 1, max = Number.POSITIVE_INFINITY) =>
  typeof value === "string" && value.trim().length >= min && value.length <= max;
const isFiniteNumber = (value) => Number.isFinite(Number(value));
const isPositiveNumber = (value) => isFiniteNumber(value) && Number(value) > 0;
const isPositiveInteger = (value) => Number.isInteger(Number(value)) && Number(value) > 0;
const isIsoDate = (value) => isText(value) && !Number.isNaN(Date.parse(value));

function requireText(errors, path, value, min = 1, max = Number.POSITIVE_INFINITY) {
  if (!isText(value, min, max)) {
    const upper = Number.isFinite(max) ? max : "∞";
    errors.push(`${path} must be a string between ${min} and ${upper} characters.`);
  }
}

function requireStringArray(errors, path, value, { minItems = 0 } = {}) {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array.`);
    return;
  }
  if (value.length < minItems) {
    errors.push(`${path} must contain at least ${minItems} item(s).`);
  }
  value.forEach((item, index) => requireText(errors, `${path}[${index}]`, item));
}

function addUniqueId(errors, set, path, id) {
  requireText(errors, path, id);
  if (!isText(id)) return;
  if (set.has(id)) errors.push(`Duplicate id at ${path}: ${id}.`);
  set.add(id);
}

function checkUniqueOrder(errors, set, path, order) {
  if (!isPositiveInteger(order)) {
    errors.push(`${path} must be a positive integer.`);
    return;
  }
  const normalized = Number(order);
  if (set.has(normalized)) errors.push(`Duplicate order at ${path}: ${normalized}.`);
  set.add(normalized);
}

function validateIdentity(project, errors) {
  const identity = project.project;
  if (!isObject(identity)) {
    errors.push("project is required and must be an object.");
    return null;
  }

  requireText(errors, "project.id", identity.id, 1, 200);
  requireText(errors, "project.title", identity.title, 1, 160);
  requireText(errors, "project.language", identity.language, 2, 20);
  if (!SUPPORTED_FORMATS.has(identity.format)) {
    errors.push(`project.format is unsupported: ${identity.format}.`);
  }
  if (!isPositiveNumber(identity.durationMinutes) || Number(identity.durationMinutes) > 240) {
    errors.push("project.durationMinutes must be greater than 0 and at most 240.");
  }
  requireText(errors, "project.audience", identity.audience, 1, 240);
  requireText(errors, "project.tone", identity.tone, 1, 240);
  requireText(errors, "project.sourceIdea", identity.sourceIdea, 20, 12_000);
  if (!isIsoDate(identity.createdAt)) {
    errors.push("project.createdAt must be an ISO-compatible date-time.");
  }
  if (!isIsoDate(identity.updatedAt)) {
    errors.push("project.updatedAt must be an ISO-compatible date-time.");
  }
  return identity;
}

function validateVisualDirection(visual, errors) {
  if (!isObject(visual)) {
    errors.push("productionBible.visualDirection is required and must be an object.");
    return;
  }
  requireText(errors, "productionBible.visualDirection.style", visual.style);
  requireStringArray(errors, "productionBible.visualDirection.palette", visual.palette, {
    minItems: 1,
  });
  requireText(errors, "productionBible.visualDirection.lighting", visual.lighting);
  requireText(errors, "productionBible.visualDirection.cameraLanguage", visual.cameraLanguage);
}

function validateProductionBible(project, errors) {
  const bible = project.productionBible;
  if (!isObject(bible)) {
    errors.push("productionBible is required and must be an object.");
    return;
  }
  requireText(errors, "productionBible.logline", bible.logline);
  requireText(errors, "productionBible.synopsis", bible.synopsis);
  requireStringArray(errors, "productionBible.themes", bible.themes, { minItems: 1 });
  requireStringArray(errors, "productionBible.continuityRules", bible.continuityRules, {
    minItems: 1,
  });
  validateVisualDirection(bible.visualDirection, errors);
}

function validateCharacter(character, index, ids, errors) {
  const path = `characters[${index}]`;
  if (!isObject(character)) {
    errors.push(`${path} must be an object.`);
    return;
  }
  addUniqueId(errors, ids, `${path}.id`, character.id);
  requireText(errors, `${path}.name`, character.name);
  requireText(errors, `${path}.role`, character.role);
  requireText(errors, `${path}.goal`, character.goal);
  requireText(errors, `${path}.conflict`, character.conflict);
  requireText(errors, `${path}.visualIdentity`, character.visualIdentity);
  requireStringArray(errors, `${path}.continuityRules`, character.continuityRules, {
    minItems: 1,
  });
}

function validateCharacters(project, errors) {
  const ids = new Set();
  if (!Array.isArray(project.characters) || project.characters.length === 0) {
    errors.push("characters must contain at least one character.");
    return ids;
  }
  project.characters.forEach((character, index) => {
    validateCharacter(character, index, ids, errors);
  });
  return ids;
}

function validateLocation(location, index, ids, errors) {
  const path = `locations[${index}]`;
  if (!isObject(location)) {
    errors.push(`${path} must be an object.`);
    return;
  }
  addUniqueId(errors, ids, `${path}.id`, location.id);
  requireText(errors, `${path}.name`, location.name);
  requireText(errors, `${path}.purpose`, location.purpose);
  requireText(errors, `${path}.visualIdentity`, location.visualIdentity);
  requireStringArray(errors, `${path}.continuityRules`, location.continuityRules, {
    minItems: 1,
  });
}

function validateLocations(project, errors) {
  const ids = new Set();
  if (!Array.isArray(project.locations) || project.locations.length === 0) {
    errors.push("locations must contain at least one location.");
    return ids;
  }
  project.locations.forEach((location, index) => {
    validateLocation(location, index, ids, errors);
  });
  return ids;
}

function validateReferenceArray(value, path, knownIds, errors) {
  const localIds = new Set();
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array.`);
    return localIds;
  }

  value.forEach((id, index) => {
    requireText(errors, `${path}[${index}]`, id);
    if (localIds.has(id)) errors.push(`${path} contains duplicate ${id}.`);
    localIds.add(id);
    if (isText(id) && !knownIds.has(id)) {
      errors.push(`${path} references unknown character ${id}.`);
    }
  });
  return localIds;
}

function validateShotCharacterIds(shot, shotPath, characterIds, sceneCharacterIds, errors) {
  const path = `${shotPath}.characterIds`;
  if (!Array.isArray(shot.characterIds)) {
    errors.push(`${path} must be an array.`);
    return;
  }

  const shotCharacterIds = new Set();
  shot.characterIds.forEach((id, index) => {
    requireText(errors, `${path}[${index}]`, id);
    if (shotCharacterIds.has(id)) errors.push(`${path} contains duplicate ${id}.`);
    shotCharacterIds.add(id);
    if (isText(id) && !characterIds.has(id)) {
      errors.push(`${path} references unknown character ${id}.`);
      return;
    }
    if (isText(id) && !sceneCharacterIds.has(id)) {
      errors.push(`${path} references ${id}, but that character is not listed in the parent scene.`);
    }
  });
}

function validateShot(shot, shotIndex, context, errors) {
  const shotPath = `${context.scenePath}.shots[${shotIndex}]`;
  if (!isObject(shot)) {
    errors.push(`${shotPath} must be an object.`);
    return;
  }

  addUniqueId(errors, context.globalShotIds, `${shotPath}.id`, shot.id);
  checkUniqueOrder(errors, context.shotOrders, `${shotPath}.order`, shot.order);
  requireText(errors, `${shotPath}.framing`, shot.framing);
  requireText(errors, `${shotPath}.camera`, shot.camera);
  requireText(errors, `${shotPath}.action`, shot.action);
  if (typeof shot.dialogue !== "string") {
    errors.push(`${shotPath}.dialogue must be a string.`);
  }
  if (typeof shot.sound !== "string") {
    errors.push(`${shotPath}.sound must be a string.`);
  }
  requireText(errors, `${shotPath}.generationPrompt`, shot.generationPrompt);
  validateShotCharacterIds(
    shot,
    shotPath,
    context.characterIds,
    context.sceneCharacterIds,
    errors,
  );
}

function validateShots(scene, scenePath, characterIds, sceneCharacterIds, globalShotIds, errors) {
  if (!Array.isArray(scene.shots) || scene.shots.length === 0) {
    errors.push(`${scenePath}.shots must contain at least one shot.`);
    return;
  }

  const context = {
    scenePath,
    characterIds,
    sceneCharacterIds,
    globalShotIds,
    shotOrders: new Set(),
  };
  scene.shots.forEach((shot, index) => validateShot(shot, index, context, errors));
}

function validateScene(scene, index, context, errors) {
  const path = `scenes[${index}]`;
  if (!isObject(scene)) {
    errors.push(`${path} must be an object.`);
    return 0;
  }

  addUniqueId(errors, context.sceneIds, `${path}.id`, scene.id);
  checkUniqueOrder(errors, context.sceneOrders, `${path}.order`, scene.order);
  requireText(errors, `${path}.title`, scene.title);
  requireText(errors, `${path}.purpose`, scene.purpose);
  requireText(errors, `${path}.locationId`, scene.locationId);
  if (isText(scene.locationId) && !context.locationIds.has(scene.locationId)) {
    errors.push(`${path}.locationId references unknown location ${scene.locationId}.`);
  }

  const sceneCharacterIds = validateReferenceArray(
    scene.characterIds,
    `${path}.characterIds`,
    context.characterIds,
    errors,
  );
  const duration = validateSceneDuration(scene, path, errors);
  validateShots(
    scene,
    path,
    context.characterIds,
    sceneCharacterIds,
    context.globalShotIds,
    errors,
  );
  return duration;
}

function validateSceneDuration(scene, path, errors) {
  if (!isPositiveNumber(scene.durationSeconds)) {
    errors.push(`${path}.durationSeconds must be greater than zero.`);
    return 0;
  }
  return Number(scene.durationSeconds);
}

function validateScenes(project, characterIds, locationIds, errors) {
  const context = {
    characterIds,
    locationIds,
    sceneIds: new Set(),
    sceneOrders: new Set(),
    globalShotIds: new Set(),
  };
  if (!Array.isArray(project.scenes) || project.scenes.length === 0) {
    errors.push("scenes must contain at least one scene.");
    return { sceneIds: context.sceneIds, durationTotal: 0 };
  }

  let durationTotal = 0;
  project.scenes.forEach((scene, index) => {
    durationTotal += validateScene(scene, index, context, errors);
  });
  return { sceneIds: context.sceneIds, durationTotal };
}

function validatePlannedDuration(identity, sceneDurationTotal, errors) {
  if (!isObject(identity) || !isPositiveNumber(identity.durationMinutes) || sceneDurationTotal <= 0) {
    return;
  }

  const targetSeconds = Number(identity.durationMinutes) * 60;
  if (sceneDurationTotal < targetSeconds * 0.15) {
    errors.push("Total scene duration is implausibly short compared with project.durationMinutes.");
  }
  if (sceneDurationTotal > targetSeconds * 1.25) {
    errors.push("Total scene duration exceeds project.durationMinutes by more than 25%. ");
  }
}

function validateWarning(warning, index, sceneIds, errors) {
  const path = `continuityReport.warnings[${index}]`;
  if (!isObject(warning)) {
    errors.push(`${path} must be an object.`);
    return;
  }
  if (!WARNING_SEVERITIES.has(warning.severity)) {
    errors.push(`${path}.severity must be info, warning, or error.`);
  }
  requireText(errors, `${path}.message`, warning.message);
  if (warning.sceneId === null || warning.sceneId === undefined) return;

  requireText(errors, `${path}.sceneId`, warning.sceneId);
  if (isText(warning.sceneId) && !sceneIds.has(warning.sceneId)) {
    errors.push(`${path}.sceneId references unknown scene ${warning.sceneId}.`);
  }
}

function validateContinuityReport(project, sceneIds, errors) {
  const report = project.continuityReport;
  if (!isObject(report)) {
    errors.push("continuityReport is required and must be an object.");
    return;
  }
  if (!isFiniteNumber(report.score) || Number(report.score) < 0 || Number(report.score) > 100) {
    errors.push("continuityReport.score must be between 0 and 100.");
  }
  if (!Array.isArray(report.warnings)) {
    errors.push("continuityReport.warnings must be an array.");
  } else {
    report.warnings.forEach((warning, index) => {
      validateWarning(warning, index, sceneIds, errors);
    });
  }
  if (!isIsoDate(report.checkedAt)) {
    errors.push("continuityReport.checkedAt must be an ISO-compatible date-time.");
  }
}

export function normalizeWarningSeverities(project) {
  const warnings = project?.continuityReport?.warnings;
  if (!Array.isArray(warnings)) return project;
  for (const warning of warnings) {
    if (!isObject(warning)) continue;
    if (typeof warning.severity === "string") {
      const canonical = WARNING_SEVERITY_ALIASES.get(warning.severity.toLowerCase());
      if (canonical) warning.severity = canonical;
    }
    if (typeof warning.sceneId === "string" && warning.sceneId.trim().toLowerCase() === "null") {
      warning.sceneId = null;
    }
  }
  return project;
}

export function normalizeSceneDurations(project) {
  const durationMinutes = Number(project?.project?.durationMinutes);
  const scenes = project?.scenes;
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0 || !Array.isArray(scenes) || scenes.length === 0) {
    return project;
  }

  const targetSeconds = Math.round(durationMinutes * 60);
  const durations = scenes.map((scene) => Number(scene?.durationSeconds));
  const allPositive = durations.every((duration) => Number.isFinite(duration) && duration > 0);
  const currentTotal = allPositive ? durations.reduce((total, duration) => total + duration, 0) : 0;
  if (currentTotal >= targetSeconds * 0.15 && currentTotal <= targetSeconds * 1.25) {
    return project;
  }

  const weights = allPositive ? durations : scenes.map(() => 1);
  const weightTotal = weights.reduce((total, weight) => total + weight, 0);
  let allocated = 0;
  scenes.forEach((scene, index) => {
    const isLast = index === scenes.length - 1;
    const seconds = isLast
      ? Math.max(1, targetSeconds - allocated)
      : Math.max(1, Math.round((targetSeconds * weights[index]) / weightTotal));
    scene.durationSeconds = seconds;
    allocated += seconds;
  });
  return project;
}

export function validateProject(project) {
  if (!isObject(project)) return ["Project must be a JSON object."];

  const errors = [];
  if (project.schemaVersion !== PROJECT_SCHEMA) {
    errors.push(`schemaVersion must be ${PROJECT_SCHEMA}.`);
  }

  const identity = validateIdentity(project, errors);
  validateProductionBible(project, errors);
  const characterIds = validateCharacters(project, errors);
  const locationIds = validateLocations(project, errors);
  const sceneState = validateScenes(project, characterIds, locationIds, errors);
  validatePlannedDuration(identity, sceneState.durationTotal, errors);
  validateContinuityReport(project, sceneState.sceneIds, errors);
  return [...new Set(errors)];
}

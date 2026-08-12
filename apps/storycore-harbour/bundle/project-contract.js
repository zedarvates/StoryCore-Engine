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

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isText = (value, min = 1, max = Number.POSITIVE_INFINITY) =>
  typeof value === "string" && value.trim().length >= min && value.length <= max;
const isFiniteNumber = (value) => Number.isFinite(Number(value));
const isPositiveNumber = (value) => isFiniteNumber(value) && Number(value) > 0;
const isPositiveInteger = (value) => Number.isInteger(Number(value)) && Number(value) > 0;
const isIsoDate = (value) => isText(value) && !Number.isNaN(Date.parse(value));

function requireText(errors, path, value, min = 1, max = Number.POSITIVE_INFINITY) {
  if (!isText(value, min, max)) {
    errors.push(`${path} must be a string between ${min} and ${Number.isFinite(max) ? max : "∞"} characters.`);
  }
}

function requireStringArray(errors, path, value, { minItems = 0 } = {}) {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array.`);
    return;
  }
  if (value.length < minItems) errors.push(`${path} must contain at least ${minItems} item(s).`);
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

export function validateProject(project) {
  const errors = [];
  if (!isObject(project)) return ["Project must be a JSON object."];

  if (project.schemaVersion !== PROJECT_SCHEMA) {
    errors.push(`schemaVersion must be ${PROJECT_SCHEMA}.`);
  }

  const identity = project.project;
  if (!isObject(identity)) {
    errors.push("project is required and must be an object.");
  } else {
    requireText(errors, "project.id", identity.id, 1, 200);
    requireText(errors, "project.title", identity.title, 1, 160);
    requireText(errors, "project.language", identity.language, 2, 20);
    if (!SUPPORTED_FORMATS.has(identity.format)) errors.push(`project.format is unsupported: ${identity.format}.`);
    if (!isPositiveNumber(identity.durationMinutes) || Number(identity.durationMinutes) > 240) {
      errors.push("project.durationMinutes must be greater than 0 and at most 240.");
    }
    requireText(errors, "project.audience", identity.audience, 1, 240);
    requireText(errors, "project.tone", identity.tone, 1, 240);
    requireText(errors, "project.sourceIdea", identity.sourceIdea, 20, 12000);
    if (!isIsoDate(identity.createdAt)) errors.push("project.createdAt must be an ISO-compatible date-time.");
    if (!isIsoDate(identity.updatedAt)) errors.push("project.updatedAt must be an ISO-compatible date-time.");
  }

  const bible = project.productionBible;
  if (!isObject(bible)) {
    errors.push("productionBible is required and must be an object.");
  } else {
    requireText(errors, "productionBible.logline", bible.logline);
    requireText(errors, "productionBible.synopsis", bible.synopsis);
    requireStringArray(errors, "productionBible.themes", bible.themes, { minItems: 1 });
    requireStringArray(errors, "productionBible.continuityRules", bible.continuityRules, { minItems: 1 });

    const visual = bible.visualDirection;
    if (!isObject(visual)) {
      errors.push("productionBible.visualDirection is required and must be an object.");
    } else {
      requireText(errors, "productionBible.visualDirection.style", visual.style);
      requireStringArray(errors, "productionBible.visualDirection.palette", visual.palette, { minItems: 1 });
      requireText(errors, "productionBible.visualDirection.lighting", visual.lighting);
      requireText(errors, "productionBible.visualDirection.cameraLanguage", visual.cameraLanguage);
    }
  }

  const characterIds = new Set();
  if (!Array.isArray(project.characters) || project.characters.length === 0) {
    errors.push("characters must contain at least one character.");
  } else {
    project.characters.forEach((character, index) => {
      const path = `characters[${index}]`;
      if (!isObject(character)) {
        errors.push(`${path} must be an object.`);
        return;
      }
      addUniqueId(errors, characterIds, `${path}.id`, character.id);
      requireText(errors, `${path}.name`, character.name);
      requireText(errors, `${path}.role`, character.role);
      requireText(errors, `${path}.goal`, character.goal);
      requireText(errors, `${path}.conflict`, character.conflict);
      requireText(errors, `${path}.visualIdentity`, character.visualIdentity);
      requireStringArray(errors, `${path}.continuityRules`, character.continuityRules, { minItems: 1 });
    });
  }

  const locationIds = new Set();
  if (!Array.isArray(project.locations) || project.locations.length === 0) {
    errors.push("locations must contain at least one location.");
  } else {
    project.locations.forEach((location, index) => {
      const path = `locations[${index}]`;
      if (!isObject(location)) {
        errors.push(`${path} must be an object.`);
        return;
      }
      addUniqueId(errors, locationIds, `${path}.id`, location.id);
      requireText(errors, `${path}.name`, location.name);
      requireText(errors, `${path}.purpose`, location.purpose);
      requireText(errors, `${path}.visualIdentity`, location.visualIdentity);
      requireStringArray(errors, `${path}.continuityRules`, location.continuityRules, { minItems: 1 });
    });
  }

  const sceneIds = new Set();
  const sceneOrders = new Set();
  const globalShotIds = new Set();
  let sceneDurationTotal = 0;

  if (!Array.isArray(project.scenes) || project.scenes.length === 0) {
    errors.push("scenes must contain at least one scene.");
  } else {
    project.scenes.forEach((scene, sceneIndex) => {
      const path = `scenes[${sceneIndex}]`;
      if (!isObject(scene)) {
        errors.push(`${path} must be an object.`);
        return;
      }
      addUniqueId(errors, sceneIds, `${path}.id`, scene.id);
      checkUniqueOrder(errors, sceneOrders, `${path}.order`, scene.order);
      requireText(errors, `${path}.title`, scene.title);
      requireText(errors, `${path}.purpose`, scene.purpose);

      requireText(errors, `${path}.locationId`, scene.locationId);
      if (isText(scene.locationId) && !locationIds.has(scene.locationId)) {
        errors.push(`${path}.locationId references unknown location ${scene.locationId}.`);
      }

      const sceneCharacterIds = new Set();
      if (!Array.isArray(scene.characterIds)) {
        errors.push(`${path}.characterIds must be an array.`);
      } else {
        scene.characterIds.forEach((id, index) => {
          requireText(errors, `${path}.characterIds[${index}]`, id);
          if (sceneCharacterIds.has(id)) errors.push(`${path}.characterIds contains duplicate ${id}.`);
          sceneCharacterIds.add(id);
          if (isText(id) && !characterIds.has(id)) errors.push(`${path}.characterIds references unknown character ${id}.`);
        });
      }

      if (!isPositiveNumber(scene.durationSeconds)) {
        errors.push(`${path}.durationSeconds must be greater than zero.`);
      } else {
        sceneDurationTotal += Number(scene.durationSeconds);
      }

      if (!Array.isArray(scene.shots) || scene.shots.length === 0) {
        errors.push(`${path}.shots must contain at least one shot.`);
        return;
      }

      const shotOrders = new Set();
      scene.shots.forEach((shot, shotIndex) => {
        const shotPath = `${path}.shots[${shotIndex}]`;
        if (!isObject(shot)) {
          errors.push(`${shotPath} must be an object.`);
          return;
        }
        addUniqueId(errors, globalShotIds, `${shotPath}.id`, shot.id);
        checkUniqueOrder(errors, shotOrders, `${shotPath}.order`, shot.order);
        requireText(errors, `${shotPath}.framing`, shot.framing);
        requireText(errors, `${shotPath}.camera`, shot.camera);
        requireText(errors, `${shotPath}.action`, shot.action);
        if (typeof shot.dialogue !== "string") errors.push(`${shotPath}.dialogue must be a string.`);
        if (typeof shot.sound !== "string") errors.push(`${shotPath}.sound must be a string.`);
        requireText(errors, `${shotPath}.generationPrompt`, shot.generationPrompt);

        if (!Array.isArray(shot.characterIds)) {
          errors.push(`${shotPath}.characterIds must be an array.`);
        } else {
          const shotCharacterIds = new Set();
          shot.characterIds.forEach((id, index) => {
            requireText(errors, `${shotPath}.characterIds[${index}]`, id);
            if (shotCharacterIds.has(id)) errors.push(`${shotPath}.characterIds contains duplicate ${id}.`);
            shotCharacterIds.add(id);
            if (isText(id) && !characterIds.has(id)) {
              errors.push(`${shotPath}.characterIds references unknown character ${id}.`);
            }
            if (isText(id) && characterIds.has(id) && !sceneCharacterIds.has(id)) {
              errors.push(`${shotPath}.characterIds references ${id}, but that character is not listed in the parent scene.`);
            }
          });
        }
      });
    });
  }

  if (isObject(identity) && isPositiveNumber(identity.durationMinutes) && sceneDurationTotal > 0) {
    const targetSeconds = Number(identity.durationMinutes) * 60;
    if (sceneDurationTotal < targetSeconds * 0.15) {
      errors.push("Total scene duration is implausibly short compared with project.durationMinutes.");
    }
    if (sceneDurationTotal > targetSeconds * 1.25) {
      errors.push("Total scene duration exceeds project.durationMinutes by more than 25%. ");
    }
  }

  const report = project.continuityReport;
  if (!isObject(report)) {
    errors.push("continuityReport is required and must be an object.");
  } else {
    if (!isFiniteNumber(report.score) || Number(report.score) < 0 || Number(report.score) > 100) {
      errors.push("continuityReport.score must be between 0 and 100.");
    }
    if (!Array.isArray(report.warnings)) {
      errors.push("continuityReport.warnings must be an array.");
    } else {
      report.warnings.forEach((warning, index) => {
        const path = `continuityReport.warnings[${index}]`;
        if (!isObject(warning)) {
          errors.push(`${path} must be an object.`);
          return;
        }
        if (!WARNING_SEVERITIES.has(warning.severity)) {
          errors.push(`${path}.severity must be info, warning, or error.`);
        }
        requireText(errors, `${path}.message`, warning.message);
        if (warning.sceneId !== null && warning.sceneId !== undefined) {
          requireText(errors, `${path}.sceneId`, warning.sceneId);
          if (isText(warning.sceneId) && !sceneIds.has(warning.sceneId)) {
            errors.push(`${path}.sceneId references unknown scene ${warning.sceneId}.`);
          }
        }
      });
    }
    if (!isIsoDate(report.checkedAt)) errors.push("continuityReport.checkedAt must be an ISO-compatible date-time.");
  }

  return [...new Set(errors)];
}

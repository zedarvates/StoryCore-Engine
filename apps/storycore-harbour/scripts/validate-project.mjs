#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export function validateProject(project) {
  const errors = [];
  const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);
  const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;
  const array = (value) => Array.isArray(value);

  if (!isObject(project)) return ["Project must be a JSON object."];
  if (project.schemaVersion !== "storycore-harbour.project.v1") {
    errors.push("schemaVersion must be storycore-harbour.project.v1.");
  }

  const p = project.project;
  if (!isObject(p)) {
    errors.push("project is required.");
  } else {
    for (const key of ["id", "title", "language", "format", "audience", "tone", "sourceIdea", "createdAt", "updatedAt"]) {
      if (!nonEmpty(p[key])) errors.push(`project.${key} must be a non-empty string.`);
    }
    if (!(Number(p.durationMinutes) > 0)) errors.push("project.durationMinutes must be greater than zero.");
  }

  const bible = project.productionBible;
  if (!isObject(bible)) {
    errors.push("productionBible is required.");
  } else {
    for (const key of ["logline", "synopsis"]) {
      if (!nonEmpty(bible[key])) errors.push(`productionBible.${key} must be a non-empty string.`);
    }
    if (!array(bible.themes) || bible.themes.length === 0) errors.push("productionBible.themes must not be empty.");
    if (!array(bible.continuityRules) || bible.continuityRules.length === 0) errors.push("productionBible.continuityRules must not be empty.");
    if (!isObject(bible.visualDirection)) errors.push("productionBible.visualDirection is required.");
  }

  if (!array(project.characters) || project.characters.length === 0) errors.push("characters must not be empty.");
  if (!array(project.locations) || project.locations.length === 0) errors.push("locations must not be empty.");
  if (!array(project.scenes) || project.scenes.length === 0) errors.push("scenes must not be empty.");

  const characterIds = new Set();
  for (const [index, character] of (project.characters || []).entries()) {
    if (!isObject(character)) {
      errors.push(`characters[${index}] must be an object.`);
      continue;
    }
    for (const key of ["id", "name", "role", "goal", "conflict", "visualIdentity"]) {
      if (!nonEmpty(character[key])) errors.push(`characters[${index}].${key} must be a non-empty string.`);
    }
    if (characterIds.has(character.id)) errors.push(`Duplicate character id: ${character.id}.`);
    characterIds.add(character.id);
  }

  const locationIds = new Set();
  for (const [index, location] of (project.locations || []).entries()) {
    if (!isObject(location)) {
      errors.push(`locations[${index}] must be an object.`);
      continue;
    }
    for (const key of ["id", "name", "purpose", "visualIdentity"]) {
      if (!nonEmpty(location[key])) errors.push(`locations[${index}].${key} must be a non-empty string.`);
    }
    if (locationIds.has(location.id)) errors.push(`Duplicate location id: ${location.id}.`);
    locationIds.add(location.id);
  }

  const sceneIds = new Set();
  const shotIds = new Set();
  for (const [sceneIndex, scene] of (project.scenes || []).entries()) {
    if (!isObject(scene)) {
      errors.push(`scenes[${sceneIndex}] must be an object.`);
      continue;
    }
    if (!nonEmpty(scene.id)) errors.push(`scenes[${sceneIndex}].id must be a non-empty string.`);
    if (sceneIds.has(scene.id)) errors.push(`Duplicate scene id: ${scene.id}.`);
    sceneIds.add(scene.id);
    if (!locationIds.has(scene.locationId)) errors.push(`Scene ${scene.id || sceneIndex} references unknown location ${scene.locationId}.`);
    for (const id of scene.characterIds || []) {
      if (!characterIds.has(id)) errors.push(`Scene ${scene.id || sceneIndex} references unknown character ${id}.`);
    }
    if (!(Number(scene.durationSeconds) > 0)) errors.push(`Scene ${scene.id || sceneIndex} durationSeconds must be greater than zero.`);
    if (!array(scene.shots) || scene.shots.length === 0) {
      errors.push(`Scene ${scene.id || sceneIndex} must contain at least one shot.`);
      continue;
    }
    for (const [shotIndex, shot] of scene.shots.entries()) {
      if (!isObject(shot)) {
        errors.push(`Scene ${scene.id || sceneIndex} shot ${shotIndex} must be an object.`);
        continue;
      }
      if (!nonEmpty(shot.id)) errors.push(`Scene ${scene.id || sceneIndex} shot ${shotIndex} requires an id.`);
      if (shotIds.has(shot.id)) errors.push(`Duplicate shot id: ${shot.id}.`);
      shotIds.add(shot.id);
      for (const key of ["framing", "camera", "action", "generationPrompt"]) {
        if (!nonEmpty(shot[key])) errors.push(`Shot ${shot.id || shotIndex}.${key} must be a non-empty string.`);
      }
      for (const id of shot.characterIds || []) {
        if (!characterIds.has(id)) errors.push(`Shot ${shot.id || shotIndex} references unknown character ${id}.`);
      }
    }
  }

  const report = project.continuityReport;
  if (!isObject(report)) {
    errors.push("continuityReport is required.");
  } else {
    const score = Number(report.score);
    if (!Number.isFinite(score) || score < 0 || score > 100) errors.push("continuityReport.score must be between 0 and 100.");
    if (!array(report.warnings)) errors.push("continuityReport.warnings must be an array.");
    if (!nonEmpty(report.checkedAt)) errors.push("continuityReport.checkedAt must be a non-empty string.");
  }

  return errors;
}

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: node scripts/validate-project.mjs <project.json>");
    process.exitCode = 2;
    return;
  }
  try {
    const project = JSON.parse(await readFile(path, "utf8"));
    const errors = validateProject(project);
    if (errors.length) {
      console.error(`Contract validation failed (${errors.length}):`);
      for (const error of errors) console.error(`- ${error}`);
      process.exitCode = 1;
      return;
    }
    console.log(`Valid StoryCore Harbour project: ${path}`);
  } catch (error) {
    console.error(`Unable to validate ${path}: ${error.message}`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  await main();
}

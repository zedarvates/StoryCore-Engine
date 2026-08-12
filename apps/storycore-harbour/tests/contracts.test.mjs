import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateProject } from "../scripts/validate-project.mjs";

const sample = JSON.parse(
  await readFile(new URL("../examples/sample-project.json", import.meta.url), "utf8")
);

const clone = (value) => structuredClone(value);

function expectContractError(name, mutate, pattern) {
  test(name, () => {
    const value = clone(sample);
    mutate(value);
    const output = validateProject(value).join("\n");
    assert.match(output, pattern);
  });
}

test("sample project passes the contract", () => {
  assert.deepEqual(validateProject(sample), []);
});

expectContractError("wrong schema version is rejected", (value) => {
  value.schemaVersion = "unknown";
}, /schemaVersion/);

expectContractError("unsupported format is rejected", (value) => {
  value.project.format = "feature-game";
}, /format is unsupported/);

expectContractError("short source idea is rejected", (value) => {
  value.project.sourceIdea = "too short";
}, /sourceIdea/);

expectContractError("missing visual direction is rejected", (value) => {
  delete value.productionBible.visualDirection;
}, /visualDirection/);

expectContractError("empty production continuity rules are rejected", (value) => {
  value.productionBible.continuityRules = [];
}, /continuityRules.*at least 1/);

expectContractError("duplicate character ids are rejected", (value) => {
  value.characters[1].id = value.characters[0].id;
}, /Duplicate id.*characters/);

expectContractError("empty character continuity rules are rejected", (value) => {
  value.characters[0].continuityRules = [];
}, /characters\[0\].continuityRules.*at least 1/);

expectContractError("duplicate location ids are rejected", (value) => {
  value.locations[1].id = value.locations[0].id;
}, /Duplicate id.*locations/);

expectContractError("unknown scene location is rejected", (value) => {
  value.scenes[0].locationId = "missing-location";
}, /unknown location/);

expectContractError("duplicate scene order is rejected", (value) => {
  value.scenes[1].order = value.scenes[0].order;
}, /Duplicate order.*scenes/);

expectContractError("unknown scene character is rejected", (value) => {
  value.scenes[0].characterIds = ["missing-character"];
}, /unknown character/);

expectContractError("shot character must be declared by parent scene", (value) => {
  value.scenes[0].shots[0].characterIds = ["char-chen"];
}, /not listed in the parent scene/);

expectContractError("unknown shot character is rejected", (value) => {
  value.scenes[0].shots[0].characterIds = ["missing-character"];
}, /unknown character/);

expectContractError("duplicate shot ids are rejected globally", (value) => {
  value.scenes[1].shots[0].id = value.scenes[0].shots[0].id;
}, /Duplicate id.*shots/);

expectContractError("duplicate shot order in a scene is rejected", (value) => {
  const second = clone(value.scenes[0].shots[0]);
  second.id = "shot-1-2";
  value.scenes[0].shots.push(second);
}, /Duplicate order.*shots/);

expectContractError("empty scenes are rejected", (value) => {
  value.scenes = [];
}, /scenes must contain at least one/);

expectContractError("implausibly short scene plan is rejected", (value) => {
  value.scenes.forEach((scene) => { scene.durationSeconds = 1; });
}, /implausibly short/);

expectContractError("scene plan cannot exceed project duration by more than 25 percent", (value) => {
  value.scenes[0].durationSeconds = 301;
  value.scenes[1].durationSeconds = 1;
}, /exceeds project\.durationMinutes/);

expectContractError("out-of-range continuity score is rejected", (value) => {
  value.continuityReport.score = 101;
}, /between 0 and 100/);

expectContractError("invalid warning severity is rejected", (value) => {
  value.continuityReport.warnings[0].severity = "critical";
}, /severity must be info, warning, or error/);

expectContractError("warning cannot reference an unknown scene", (value) => {
  value.continuityReport.warnings[0].sceneId = "scene-missing";
}, /references unknown scene/);

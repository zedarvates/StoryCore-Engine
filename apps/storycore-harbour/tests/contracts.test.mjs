import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateProject } from "../scripts/validate-project.mjs";

const sample = JSON.parse(
  await readFile(new URL("../examples/sample-project.json", import.meta.url), "utf8")
);

const clone = (value) => structuredClone(value);

test("sample project passes the contract", () => {
  assert.deepEqual(validateProject(sample), []);
});

test("wrong schema version is rejected", () => {
  const value = clone(sample);
  value.schemaVersion = "unknown";
  assert.match(validateProject(value).join("\n"), /schemaVersion/);
});

test("unknown scene location is rejected", () => {
  const value = clone(sample);
  value.scenes[0].locationId = "missing-location";
  assert.match(validateProject(value).join("\n"), /unknown location/);
});

test("unknown shot character is rejected", () => {
  const value = clone(sample);
  value.scenes[0].shots[0].characterIds = ["missing-character"];
  assert.match(validateProject(value).join("\n"), /unknown character/);
});

test("duplicate shot ids are rejected", () => {
  const value = clone(sample);
  value.scenes[1].shots[0].id = value.scenes[0].shots[0].id;
  assert.match(validateProject(value).join("\n"), /Duplicate shot id/);
});

test("empty scenes are rejected", () => {
  const value = clone(sample);
  value.scenes = [];
  assert.match(validateProject(value).join("\n"), /scenes must not be empty/);
});

test("out-of-range continuity score is rejected", () => {
  const value = clone(sample);
  value.continuityReport.score = 101;
  assert.match(validateProject(value).join("\n"), /between 0 and 100/);
});

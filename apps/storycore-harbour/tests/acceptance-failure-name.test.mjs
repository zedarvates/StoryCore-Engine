import assert from "node:assert/strict";
import test from "node:test";

import { publicFailureName } from "../bundle/acceptance-failure.js";

test("contract failure details map to stable privacy-safe names", () => {
  assert.equal(publicFailureName("JSON parse failed: Unterminated string", "contract"), "json_invalid");
  assert.equal(publicFailureName("warnings[0].severity must be info", "contract"), "warning_severity_invalid");
  assert.equal(publicFailureName("sceneId references unknown scene secret-scene", "contract"), "reference_invalid");
  assert.equal(
    publicFailureName("shot references secret-character, but that character is not listed in the parent scene", "contract"),
    "reference_invalid",
  );
  assert.equal(publicFailureName("Total scene duration is implausibly short", "contract"), "duration_invalid");
  assert.equal(publicFailureName("schemaVersion must be storycore.project.v1", "contract"), "schema_invalid");
  assert.equal(publicFailureName("project.format is unsupported: private-format", "contract"), "schema_invalid");
  assert.equal(publicFailureName("project.createdAt must be an ISO-compatible date-time", "contract"), "timestamp_invalid");
  assert.equal(publicFailureName("Duplicate id at characters[1]: private-id", "contract"), "duplicate_invalid");
  assert.equal(publicFailureName("scenes[0].order must be a positive integer", "contract"), "ordering_invalid");
  assert.equal(publicFailureName("continuityReport.score must be between 0 and 100", "contract"), "continuity_score_invalid");
  assert.equal(publicFailureName("scenes must be an array", "contract"), "structure_invalid");
});

test("unknown contract details never enter the public failure name", () => {
  assert.equal(publicFailureName("Private generated character text", "contract"), "contract_invalid");
});

test("non-contract categories retain stable names", () => {
  assert.equal(publicFailureName("request timed out", "timeout"), "timeout");
  assert.equal(publicFailureName("provider failed", "provider"), "provider");
});

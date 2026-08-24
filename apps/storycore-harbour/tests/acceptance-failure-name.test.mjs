import assert from "node:assert/strict";
import test from "node:test";

import { publicFailureName } from "../bundle/acceptance-failure.js";

test("contract failure details map to stable privacy-safe names", () => {
  assert.equal(publicFailureName("JSON parse failed: Unterminated string", "contract"), "json_invalid");
  assert.equal(publicFailureName("warnings[0].severity must be info", "contract"), "warning_severity_invalid");
  assert.equal(publicFailureName("sceneId references unknown scene secret-scene", "contract"), "reference_invalid");
  assert.equal(publicFailureName("Total scene duration is implausibly short", "contract"), "duration_invalid");
});

test("unknown contract details never enter the public failure name", () => {
  assert.equal(publicFailureName("Private generated character text", "contract"), "contract_invalid");
});

test("non-contract categories retain stable names", () => {
  assert.equal(publicFailureName("request timed out", "timeout"), "timeout");
  assert.equal(publicFailureName("provider failed", "provider"), "provider");
});

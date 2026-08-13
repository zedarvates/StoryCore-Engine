import test from "node:test";
import assert from "node:assert/strict";
import { toPublicSummary } from "../scripts/evaluate-acceptance.mjs";

test("public acceptance output strips model-derived validation text", () => {
  const secret = "private generated dialogue that must never reach evaluator logs";
  const report = toPublicSummary({
    gatePassed: false,
    corpusErrors: [],
    promptCount: 20,
    passCount: 19,
    targetPasses: 18,
    failures: [
      {
        promptId: "HBR-A01",
        category: "contract",
        reasons: [secret],
      },
    ],
    medianDurationMs: 1200,
    p95DurationMs: 2400,
    maxMedianDurationMs: 180000,
    repairCount: 1,
    structuralFailureCount: 0,
  });

  const serialized = JSON.stringify(report);
  assert.equal(report.failures[0].promptId, "HBR-A01");
  assert.equal(report.failures[0].category, "contract");
  assert.equal(report.failures[0].reasonCount, 1);
  assert.equal(serialized.includes(secret), false);
  assert.equal(serialized.includes("reasons"), false);
});

test("public acceptance output replaces unknown identifiers and categories", () => {
  const report = toPublicSummary({
    gatePassed: false,
    corpusErrors: [],
    failures: [
      {
        promptId: "user-controlled-private-id",
        category: "user-controlled-private-category",
        reasons: [],
      },
    ],
  });

  assert.equal(report.failures[0].promptId, "unknown-result");
  assert.equal(report.failures[0].category, "unknown");
});

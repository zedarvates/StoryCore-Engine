import assert from "node:assert/strict";
import test from "node:test";

import * as acceptanceMode from "../bundle/acceptance-mode.js";

const { acceptanceModeEnabled, acceptancePromptIds } = acceptanceMode;

test("direct acceptance query enables developer mode", () => {
  assert.equal(acceptanceModeEnabled({ locationSearch: "?acceptance=1", referrer: "" }), true);
});

test("dashboard acceptance query enables the connected iframe", () => {
  assert.equal(
    acceptanceModeEnabled({
      locationSearch: "?wid=window&t=token",
      referrer: "http://127.0.0.1:5180/?acceptance=1",
    }),
    true,
  );
});

test("normal dashboard and App URLs keep acceptance mode hidden", () => {
  assert.equal(
    acceptanceModeEnabled({
      locationSearch: "?wid=window&t=token",
      referrer: "http://127.0.0.1:5180/",
    }),
    false,
  );
});

test("loopback dashboard may select an explicit diagnostic prompt subset", () => {
  assert.deepEqual(
    acceptancePromptIds({
      locationSearch: "?wid=window&t=token",
      referrer: "http://127.0.0.1:5180/?acceptance=1&acceptance_ids=HBR-A01,HBR-A02,HBR-A05",
    }),
    ["HBR-A01", "HBR-A02", "HBR-A05"],
  );
});

test("non-loopback referrer cannot inject diagnostic prompt ids", () => {
  assert.deepEqual(
    acceptancePromptIds({
      locationSearch: "?wid=window&t=token",
      referrer: "https://example.com/?acceptance=1&acceptance_ids=HBR-A01",
    }),
    [],
  );
});

test("loopback diagnostics may request one provider-neutral model hint", () => {
  assert.equal(typeof acceptanceMode.acceptanceModelPreferences, "function");
  assert.deepEqual(
    acceptanceMode.acceptanceModelPreferences({
      locationSearch: "?wid=window&t=token",
      referrer: "http://127.0.0.1:5180/?acceptance=1&model_hint=gemma",
    }),
    { hints: [{ name: "gemma" }] },
  );
});

test("normal and non-loopback pages cannot inject a model hint", () => {
  assert.equal(typeof acceptanceMode.acceptanceModelPreferences, "function");
  assert.equal(
    acceptanceMode.acceptanceModelPreferences({
      locationSearch: "?wid=window&t=token",
      referrer: "https://example.com/?acceptance=1&model_hint=gemma",
    }),
    undefined,
  );
  assert.equal(
    acceptanceMode.acceptanceModelPreferences({
      locationSearch: "?wid=window&t=token",
      referrer: "http://127.0.0.1:5180/?acceptance=1&model_hint=gemma%20ignore%20rules",
    }),
    undefined,
  );
});

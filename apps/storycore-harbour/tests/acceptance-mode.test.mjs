import assert from "node:assert/strict";
import test from "node:test";

import { acceptanceModeEnabled } from "../bundle/acceptance-mode.js";

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

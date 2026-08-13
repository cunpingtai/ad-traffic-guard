import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultAdTrafficGuardConfig,
  evaluateAdEligibility
} from "../dist/core/index.js";

const base = {
  elapsedMs: 10_000,
  visibleMs: 10_000,
  pageVisible: true,
  pageFocused: true,
  hadTrustedInteraction: true,
  knownBot: false,
  webdriver: false,
  localhost: false,
  prerender: false,
  pageViewsInWindow: 1,
  reloadsInWindow: 0
};

test("allows an engaged visible visitor after the interaction threshold", () => {
  const result = evaluateAdEligibility(base, defaultAdTrafficGuardConfig);
  assert.equal(result.allowed, true);
  assert.equal(result.status, "allowed");
  assert.equal(result.reason, "trusted-interaction");
});

test("blocks known bots", () => {
  const result = evaluateAdEligibility(
    { ...base, knownBot: true },
    defaultAdTrafficGuardConfig
  );
  assert.equal(result.allowed, false);
  assert.equal(result.status, "blocked");
  assert.equal(result.reason, "known-bot");
});

test("allows a passive focused reader after passive threshold", () => {
  const result = evaluateAdEligibility(
    {
      ...base,
      hadTrustedInteraction: false,
      visibleMs: 16_000,
      elapsedMs: 16_000
    },
    defaultAdTrafficGuardConfig
  );
  assert.equal(result.allowed, true);
  assert.equal(result.reason, "passive-reader");
});

test("delays high-frequency visitors", () => {
  const result = evaluateAdEligibility(
    {
      ...base,
      pageViewsInWindow: defaultAdTrafficGuardConfig.highFrequencyPageViews,
      visibleMs: 6_000,
      elapsedMs: 6_000
    },
    defaultAdTrafficGuardConfig
  );
  assert.equal(result.allowed, false);
  assert.equal(result.status, "waiting");
  assert.equal(result.reason, "high-frequency");
});

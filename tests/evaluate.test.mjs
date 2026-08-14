import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultAdTrafficGuardConfig,
  evaluateAdEligibility,
  mergeExternalSignals,
  scoreAdTraffic
} from "../dist/core/index.js";

const gated = {
  ...defaultAdTrafficGuardConfig,
  passthrough: false
};

const base = {
  elapsedMs: 10_000,
  visibleMs: 10_000,
  pageVisible: true,
  pageFocused: true,
  hadTrustedInteraction: true,
  knownBot: false,
  browserAutomation: false,
  browserAutomationReady: true,
  browserAutomationError: false,
  localhost: false,
  prerender: false,
  pageViewsInWindow: 1,
  reloadsInWindow: 0,
  cfBotScore: undefined,
  verifiedBot: false
};

test("defaults to passthrough and allows all traffic immediately", () => {
  assert.equal(defaultAdTrafficGuardConfig.passthrough, true);

  const result = evaluateAdEligibility(
    {
      ...base,
      knownBot: true,
      browserAutomation: true,
      browserAutomationReady: false,
      localhost: true,
      visibleMs: 0,
      elapsedMs: 0,
      hadTrustedInteraction: false
    },
    defaultAdTrafficGuardConfig
  );

  assert.equal(result.allowed, true);
  assert.equal(result.status, "allowed");
  assert.equal(result.reason, "passthrough");
  assert.equal(result.risk, "trusted");
});

test("allows an engaged visible visitor after the interaction threshold", () => {
  const result = evaluateAdEligibility(base, gated);
  assert.equal(result.allowed, true);
  assert.equal(result.status, "allowed");
  assert.equal(result.reason, "trusted-interaction");
});

test("blocks known bots", () => {
  const result = evaluateAdEligibility({ ...base, knownBot: true }, gated);
  assert.equal(result.allowed, false);
  assert.equal(result.status, "blocked");
  assert.equal(result.reason, "known-bot");
});

test("blocks browser automation detected by BotD", () => {
  const result = evaluateAdEligibility(
    { ...base, browserAutomation: true },
    gated
  );
  assert.equal(result.allowed, false);
  assert.equal(result.status, "blocked");
  assert.equal(result.reason, "browser-automation");
});

test("waits while browser automation detection is pending", () => {
  const result = evaluateAdEligibility(
    {
      ...base,
      browserAutomationReady: false,
      visibleMs: 20_000,
      elapsedMs: 20_000
    },
    gated
  );
  assert.equal(result.allowed, false);
  assert.equal(result.status, "waiting");
  assert.equal(result.reason, "detecting-automation");
});

test("blocks after maxWait if automation detection never becomes ready", () => {
  const result = evaluateAdEligibility(
    {
      ...base,
      browserAutomationReady: false,
      elapsedMs: gated.maxWaitMs,
      visibleMs: gated.maxWaitMs
    },
    gated
  );
  assert.equal(result.allowed, false);
  assert.equal(result.status, "blocked");
  assert.equal(result.reason, "insufficient-signals");
});

test("allows a passive focused reader after passive threshold", () => {
  const result = evaluateAdEligibility(
    {
      ...base,
      hadTrustedInteraction: false,
      visibleMs: 16_000,
      elapsedMs: 16_000
    },
    gated
  );
  assert.equal(result.allowed, true);
  assert.equal(result.reason, "passive-reader");
});

test("delays high-frequency visitors", () => {
  const result = evaluateAdEligibility(
    {
      ...base,
      pageViewsInWindow: gated.highFrequencyPageViews,
      visibleMs: 6_000,
      elapsedMs: 6_000
    },
    gated
  );
  assert.equal(result.allowed, false);
  assert.equal(result.status, "waiting");
  assert.equal(result.reason, "high-frequency");
});

test("treats low Cloudflare bot scores as high risk when gated", () => {
  const signals = { ...base, cfBotScore: 15, hadTrustedInteraction: true };
  const score = scoreAdTraffic(signals, gated);
  assert.ok(score >= gated.highRiskThreshold);

  const result = evaluateAdEligibility(signals, gated);
  assert.equal(result.allowed, false);
  assert.equal(result.risk, "high");
});

test("blocks detector errors after maxWait instead of allowing ads when gated", () => {
  const result = evaluateAdEligibility(
    {
      ...base,
      browserAutomationError: true,
      elapsedMs: gated.maxWaitMs,
      visibleMs: gated.maxWaitMs
    },
    gated
  );
  assert.equal(result.allowed, false);
  assert.equal(result.status, "blocked");
  assert.equal(result.reason, "insufficient-signals");
});

test("mergeExternalSignals prefers explicit knownBot and verifiedBot", () => {
  const merged = mergeExternalSignals(
    {
      knownBot: false,
      browserAutomation: false,
      browserAutomationReady: true,
      browserAutomationError: false,
      verifiedBot: false
    },
    { knownBot: true, verifiedBot: true, cfBotScore: 42 }
  );

  assert.equal(merged.knownBot, true);
  assert.equal(merged.verifiedBot, true);
  assert.equal(merged.cfBotScore, 42);
});

test("mergeExternalSignals marks verified bots as known bots for ad blocking", () => {
  const merged = mergeExternalSignals(
    {
      knownBot: false,
      browserAutomation: false,
      browserAutomationReady: true,
      browserAutomationError: false,
      verifiedBot: false
    },
    { verifiedBot: true }
  );
  assert.equal(merged.knownBot, true);
  assert.equal(merged.verifiedBot, true);
});

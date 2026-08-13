import type {
  AdEligibilityResult,
  AdEligibilitySignals,
  AdTrafficGuardConfig
} from "./types.js";

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function riskFromScore(score: number, highRiskThreshold: number) {
  if (score >= highRiskThreshold) return "high" as const;
  if (score >= 30) return "uncertain" as const;
  return "trusted" as const;
}

export function scoreAdTraffic(
  signals: AdEligibilitySignals,
  config: AdTrafficGuardConfig
): number {
  if (config.blockKnownBots && signals.knownBot) return 100;
  if (config.blockWebDriver && signals.webdriver) return 100;
  if (config.disableOnLocalhost && signals.localhost) return 100;

  let score = 35;

  if (signals.prerender) score += 30;
  if (!signals.pageVisible) score += 20;
  if (!signals.pageFocused) score += 5;
  if (signals.visibleMs < 2_000) score += 10;

  if (signals.pageViewsInWindow >= config.highFrequencyPageViews) score += 25;
  if (signals.reloadsInWindow >= config.highFrequencyReloads) score += 20;

  if (signals.hadTrustedInteraction) score -= 35;
  if (signals.visibleMs >= 10_000) score -= 20;
  if (signals.visibleMs >= config.passiveMinVisibleMs && signals.pageFocused) score -= 10;

  return clampScore(score);
}

export function evaluateAdEligibility(
  signals: AdEligibilitySignals,
  config: AdTrafficGuardConfig
): AdEligibilityResult {
  const score = scoreAdTraffic(signals, config);
  const risk = riskFromScore(score, config.highRiskThreshold);

  if (config.blockKnownBots && signals.knownBot) {
    return { status: "blocked", allowed: false, risk: "high", score, reason: "known-bot", signals };
  }

  if (config.blockWebDriver && signals.webdriver) {
    return { status: "blocked", allowed: false, risk: "high", score, reason: "webdriver", signals };
  }

  if (config.disableOnLocalhost && signals.localhost) {
    return { status: "blocked", allowed: false, risk: "high", score, reason: "localhost", signals };
  }

  if (signals.prerender) {
    return { status: "waiting", allowed: false, risk, score, reason: "prerender", signals };
  }

  if (!signals.pageVisible) {
    if (signals.elapsedMs >= config.maxWaitMs) {
      return { status: "blocked", allowed: false, risk, score, reason: "hidden-page", signals };
    }
    return { status: "waiting", allowed: false, risk, score, reason: "hidden-page", signals };
  }

  const highFrequency =
    signals.pageViewsInWindow >= config.highFrequencyPageViews ||
    signals.reloadsInWindow >= config.highFrequencyReloads;

  const requiredVisibleMs = highFrequency
    ? config.highFrequencyMinVisibleMs
    : signals.hadTrustedInteraction
      ? config.interactionMinVisibleMs
      : config.passiveMinVisibleMs;

  if (risk !== "high" && signals.visibleMs >= requiredVisibleMs) {
    if (signals.hadTrustedInteraction) {
      return { status: "allowed", allowed: true, risk, score, reason: "trusted-interaction", signals };
    }

    if (signals.pageFocused) {
      return {
        status: "allowed",
        allowed: true,
        risk,
        score,
        reason: highFrequency ? "high-frequency" : "passive-reader",
        signals
      };
    }
  }

  if (signals.elapsedMs >= config.maxWaitMs || risk === "high") {
    return {
      status: "blocked",
      allowed: false,
      risk,
      score,
      reason: highFrequency ? "high-frequency" : "insufficient-signals",
      signals
    };
  }

  return {
    status: "waiting",
    allowed: false,
    risk,
    score,
    reason: highFrequency ? "high-frequency" : "insufficient-signals",
    signals
  };
}

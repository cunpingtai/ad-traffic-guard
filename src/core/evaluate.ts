import { mergeExternalSignals } from "../detectors/external.js";
import type {
  AdEligibilityResult,
  AdEligibilitySignals,
  AdTrafficGuardConfig,
  ExternalAdTrafficSignals
} from "./types.js";

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function riskFromScore(score: number, highRiskThreshold: number) {
  if (score >= highRiskThreshold) return "high" as const;
  if (score >= 30) return "uncertain" as const;
  return "trusted" as const;
}

function isLikelyAutomatedByCloudflare(
  signals: AdEligibilitySignals,
  config: AdTrafficGuardConfig
): boolean {
  return (
    typeof signals.cfBotScore === "number" &&
    signals.cfBotScore < config.cfLikelyAutomatedMaxScore
  );
}

export { mergeExternalSignals };

export function applyExternalSignals(
  signals: AdEligibilitySignals,
  external?: ExternalAdTrafficSignals
): AdEligibilitySignals {
  return {
    ...signals,
    ...mergeExternalSignals(signals, external)
  };
}

export function scoreAdTraffic(
  signals: AdEligibilitySignals,
  config: AdTrafficGuardConfig
): number {
  if (config.blockKnownBots && signals.knownBot) return 100;
  if (config.blockBrowserAutomation && signals.browserAutomation) return 100;
  if (config.disableOnLocalhost && signals.localhost) return 100;

  let score = 35;

  if (signals.browserAutomationError) score += 25;
  if (!signals.browserAutomationReady) score += 15;
  if (isLikelyAutomatedByCloudflare(signals, config)) score += 40;
  if (signals.prerender) score += 30;
  if (!signals.pageVisible) score += 20;
  if (!signals.pageFocused) score += 5;
  if (signals.visibleMs < 2_000) score += 10;

  if (signals.pageViewsInWindow >= config.highFrequencyPageViews) score += 25;
  if (signals.reloadsInWindow >= config.highFrequencyReloads) score += 20;

  if (signals.hadTrustedInteraction) score -= 35;
  if (signals.visibleMs >= 10_000) score -= 20;
  if (signals.visibleMs >= config.passiveMinVisibleMs && signals.pageFocused) {
    score -= 10;
  }

  // Cloudflare "likely automated" must remain high-risk even after positive engagement.
  if (isLikelyAutomatedByCloudflare(signals, config)) {
    score = Math.max(score, config.highRiskThreshold);
  }

  return clampScore(score);
}

export function evaluateAdEligibility(
  signals: AdEligibilitySignals,
  config: AdTrafficGuardConfig
): AdEligibilityResult {
  const merged = applyExternalSignals(signals, config.externalSignals);
  const score = scoreAdTraffic(merged, config);
  const risk = riskFromScore(score, config.highRiskThreshold);

  if (config.blockKnownBots && merged.knownBot) {
    return {
      status: "blocked",
      allowed: false,
      risk: "high",
      score,
      reason: "known-bot",
      signals: merged
    };
  }

  if (config.blockBrowserAutomation && merged.browserAutomation) {
    return {
      status: "blocked",
      allowed: false,
      risk: "high",
      score,
      reason: "browser-automation",
      signals: merged
    };
  }

  if (config.disableOnLocalhost && merged.localhost) {
    return {
      status: "blocked",
      allowed: false,
      risk: "high",
      score,
      reason: "localhost",
      signals: merged
    };
  }

  if (!merged.browserAutomationReady) {
    if (merged.elapsedMs >= config.maxWaitMs) {
      return {
        status: "blocked",
        allowed: false,
        risk,
        score,
        reason: "insufficient-signals",
        signals: merged
      };
    }
    return {
      status: "waiting",
      allowed: false,
      risk,
      score,
      reason: "detecting-automation",
      signals: merged
    };
  }

  // BotD/detector failed: never treat as a trusted human for this page view.
  if (merged.browserAutomationError) {
    if (merged.elapsedMs >= config.maxWaitMs) {
      return {
        status: "blocked",
        allowed: false,
        risk: "high",
        score,
        reason: "insufficient-signals",
        signals: merged
      };
    }
    return {
      status: "waiting",
      allowed: false,
      risk,
      score,
      reason: "detecting-automation",
      signals: merged
    };
  }

  if (merged.prerender) {
    return {
      status: "waiting",
      allowed: false,
      risk,
      score,
      reason: "prerender",
      signals: merged
    };
  }

  if (!merged.pageVisible) {
    if (merged.elapsedMs >= config.maxWaitMs) {
      return {
        status: "blocked",
        allowed: false,
        risk,
        score,
        reason: "hidden-page",
        signals: merged
      };
    }
    return {
      status: "waiting",
      allowed: false,
      risk,
      score,
      reason: "hidden-page",
      signals: merged
    };
  }

  const highFrequency =
    merged.pageViewsInWindow >= config.highFrequencyPageViews ||
    merged.reloadsInWindow >= config.highFrequencyReloads;

  const requiredVisibleMs = highFrequency
    ? config.highFrequencyMinVisibleMs
    : merged.hadTrustedInteraction
      ? config.interactionMinVisibleMs
      : config.passiveMinVisibleMs;

  if (risk !== "high" && merged.visibleMs >= requiredVisibleMs) {
    if (merged.hadTrustedInteraction) {
      return {
        status: "allowed",
        allowed: true,
        risk,
        score,
        reason: "trusted-interaction",
        signals: merged
      };
    }

    if (merged.pageFocused) {
      return {
        status: "allowed",
        allowed: true,
        risk,
        score,
        reason: highFrequency ? "high-frequency" : "passive-reader",
        signals: merged
      };
    }
  }

  if (merged.elapsedMs >= config.maxWaitMs || risk === "high") {
    return {
      status: "blocked",
      allowed: false,
      risk,
      score,
      reason: highFrequency ? "high-frequency" : "insufficient-signals",
      signals: merged
    };
  }

  return {
    status: "waiting",
    allowed: false,
    risk,
    score,
    reason: highFrequency ? "high-frequency" : "insufficient-signals",
    signals: merged
  };
}

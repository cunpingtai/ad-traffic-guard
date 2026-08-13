import type { AdTrafficGuardConfig } from "./types.js";

export const defaultAdTrafficGuardConfig: AdTrafficGuardConfig = {
  interactionMinVisibleMs: 5_000,
  passiveMinVisibleMs: 15_000,
  highFrequencyMinVisibleMs: 20_000,
  maxWaitMs: 30_000,
  frequencyWindowMs: 60_000,
  highFrequencyPageViews: 10,
  highFrequencyReloads: 4,
  highRiskThreshold: 60,
  blockKnownBots: true,
  blockWebDriver: true,
  disableOnLocalhost: true,
  evaluationIntervalMs: 500,
  storageKey: "ad-traffic-guard:v1"
};

export function mergeAdTrafficGuardConfig(
  config: Partial<AdTrafficGuardConfig> = {}
): AdTrafficGuardConfig {
  return { ...defaultAdTrafficGuardConfig, ...config };
}

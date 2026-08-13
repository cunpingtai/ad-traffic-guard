export { createAdTrafficGuard } from "./guard.js";
export { evaluateAdEligibility, scoreAdTraffic } from "./evaluate.js";
export { isKnownBotUserAgent } from "./bot.js";
export { defaultAdTrafficGuardConfig, mergeAdTrafficGuardConfig } from "./config.js";
export type {
  AdEligibilityReason,
  AdEligibilityResult,
  AdEligibilitySignals,
  AdEligibilityStatus,
  AdRiskLevel,
  AdTrafficGuardConfig,
  AdTrafficGuardController
} from "./types.js";

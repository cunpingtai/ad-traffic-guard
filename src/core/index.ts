export { createAdTrafficGuard } from "./guard.js";
export {
  applyExternalSignals,
  evaluateAdEligibility,
  mergeExternalSignals,
  scoreAdTraffic
} from "./evaluate.js";
export {
  defaultAdTrafficGuardConfig,
  mergeAdTrafficGuardConfig
} from "./config.js";
export type {
  AdEligibilityReason,
  AdEligibilityResult,
  AdEligibilitySignals,
  AdEligibilityStatus,
  AdRiskLevel,
  AdTrafficGuardConfig,
  AdTrafficGuardController,
  BrowserAutomationDetector,
  ExternalAdTrafficSignals
} from "./types.js";

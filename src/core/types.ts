export type AdRiskLevel = "trusted" | "uncertain" | "high";
export type AdEligibilityStatus = "waiting" | "allowed" | "blocked";

export type AdEligibilityReason =
  | "initializing"
  | "known-bot"
  | "webdriver"
  | "localhost"
  | "prerender"
  | "hidden-page"
  | "trusted-interaction"
  | "passive-reader"
  | "high-frequency"
  | "insufficient-signals";

export interface AdEligibilitySignals {
  elapsedMs: number;
  visibleMs: number;
  pageVisible: boolean;
  pageFocused: boolean;
  hadTrustedInteraction: boolean;
  knownBot: boolean;
  webdriver: boolean;
  localhost: boolean;
  prerender: boolean;
  pageViewsInWindow: number;
  reloadsInWindow: number;
}

export interface AdEligibilityResult {
  status: AdEligibilityStatus;
  allowed: boolean;
  risk: AdRiskLevel;
  score: number;
  reason: AdEligibilityReason;
  signals: AdEligibilitySignals;
}

export interface AdTrafficGuardConfig {
  /** Minimum visible time after a trusted interaction before ads may load. */
  interactionMinVisibleMs: number;
  /** Minimum visible time for a focused passive reader before ads may load. */
  passiveMinVisibleMs: number;
  /** High-frequency visitors must remain visible for at least this long. */
  highFrequencyMinVisibleMs: number;
  /** Stop waiting after this duration and keep ads disabled for this page view. */
  maxWaitMs: number;
  /** Rolling window used for page-view / reload frequency checks. */
  frequencyWindowMs: number;
  /** Page views inside the rolling window that trigger a higher-risk delay. */
  highFrequencyPageViews: number;
  /** Reloads inside the rolling window that trigger a higher-risk delay. */
  highFrequencyReloads: number;
  /** Score at or above this value is considered high risk. */
  highRiskThreshold: number;
  /** Hard-block recognized crawler / bot user agents. */
  blockKnownBots: boolean;
  /** Hard-block browsers exposing navigator.webdriver. */
  blockWebDriver: boolean;
  /** Keep production ads disabled on localhost / loopback hosts. */
  disableOnLocalhost: boolean;
  /** Optional extra bot detector layered on top of the built-in detector. */
  additionalBotPattern?: RegExp;
  /** Poll interval while the decision is waiting. */
  evaluationIntervalMs: number;
  /** Session storage namespace so multiple apps can isolate counters. */
  storageKey: string;
}

export interface AdTrafficGuardController {
  start(): void;
  stop(): void;
  trackPageView(): void;
  evaluate(): AdEligibilityResult;
  getSnapshot(): AdEligibilityResult;
  subscribe(listener: (result: AdEligibilityResult) => void): () => void;
}

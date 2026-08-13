export type AdRiskLevel = "trusted" | "uncertain" | "high";
export type AdEligibilityStatus = "waiting" | "allowed" | "blocked";

export type AdEligibilityReason =
  | "initializing"
  | "known-bot"
  | "browser-automation"
  | "detecting-automation"
  | "localhost"
  | "prerender"
  | "hidden-page"
  | "trusted-interaction"
  | "passive-reader"
  | "high-frequency"
  | "insufficient-signals";

export interface ExternalAdTrafficSignals {
  /** Server/edge mark from isbot (or equivalent). */
  knownBot?: boolean;
  /** Cloudflare Bot Management score (1 = most bot-like, 99 = most human-like). */
  cfBotScore?: number;
  /** Cloudflare verified bot (e.g. Googlebot). Treated as knownBot for ads. */
  verifiedBot?: boolean;
}

export interface AdEligibilitySignals {
  elapsedMs: number;
  visibleMs: number;
  pageVisible: boolean;
  pageFocused: boolean;
  hadTrustedInteraction: boolean;
  knownBot: boolean;
  /** True when BotD (or injected detector) reports browser automation. */
  browserAutomation: boolean;
  /** False until BotD / injected detector settles (success or failure). */
  browserAutomationReady: boolean;
  /** True when the automation detector threw; never treat as trusted human. */
  browserAutomationError: boolean;
  localhost: boolean;
  prerender: boolean;
  pageViewsInWindow: number;
  reloadsInWindow: number;
  cfBotScore?: number;
  verifiedBot: boolean;
}

export interface AdEligibilityResult {
  status: AdEligibilityStatus;
  allowed: boolean;
  risk: AdRiskLevel;
  score: number;
  reason: AdEligibilityReason;
  signals: AdEligibilitySignals;
}

export type BrowserAutomationDetector = () => Promise<{
  bot: boolean;
  botKind?: string;
}>;

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
  /** Hard-block requests marked as known crawlers (via externalSignals / cookie). */
  blockKnownBots: boolean;
  /** Hard-block when BotD reports browser automation. */
  blockBrowserAutomation: boolean;
  /** Keep production ads disabled on localhost / loopback hosts. */
  disableOnLocalhost: boolean;
  /** Cloudflare scores strictly below this are treated as high risk. */
  cfLikelyAutomatedMaxScore: number;
  /** Injected/server signals layered into every evaluation. */
  externalSignals?: ExternalAdTrafficSignals;
  /** Optional detector override (defaults to Fingerprint BotD). */
  detectBrowserAutomation?: BrowserAutomationDetector;
  /** Skip client automation detection (tests / constrained environments). */
  skipBrowserAutomationDetection?: boolean;
  /** Read the known-crawler cookie set by server middleware. */
  readKnownCrawlerCookie?: boolean;
  /** Poll interval while the decision is waiting. */
  evaluationIntervalMs: number;
  /** Session storage namespace so multiple apps can isolate counters. */
  storageKey: string;
}

export interface AdTrafficGuardController {
  start(): void;
  stop(): void;
  trackPageView(): void;
  setExternalSignals(signals: ExternalAdTrafficSignals): void;
  evaluate(): AdEligibilityResult;
  getSnapshot(): AdEligibilityResult;
  subscribe(listener: (result: AdEligibilityResult) => void): () => void;
}

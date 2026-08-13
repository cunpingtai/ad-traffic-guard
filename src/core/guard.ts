import {
  detectBrowserAutomationWith,
  getDefaultBrowserAutomationDetector
} from "../detectors/botd.js";
import {
  ATG_KNOWN_CRAWLER_COOKIE,
  knownCrawlerCookieValue
} from "../shared/known-crawler-mark.js";
import { mergeAdTrafficGuardConfig } from "./config.js";
import { evaluateAdEligibility } from "./evaluate.js";
import { readTrafficFrequency, recordPageView } from "./session.js";
import type {
  AdEligibilityResult,
  AdEligibilitySignals,
  AdTrafficGuardConfig,
  AdTrafficGuardController,
  ExternalAdTrafficSignals
} from "./types.js";

function isLocalHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost")
  );
}

function isReloadNavigation(): boolean {
  if (typeof performance === "undefined") return false;
  const entry = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  return entry?.type === "reload";
}

function isPrerendered(): boolean {
  if (typeof document === "undefined") return false;
  return (document as Document & { prerendering?: boolean }).prerendering === true;
}

function readKnownCrawlerCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .some((part) => part === `${ATG_KNOWN_CRAWLER_COOKIE}=${knownCrawlerCookieValue}`);
}

function initialSignals(): AdEligibilitySignals {
  return {
    elapsedMs: 0,
    visibleMs: 0,
    pageVisible: false,
    pageFocused: false,
    hadTrustedInteraction: false,
    knownBot: false,
    browserAutomation: false,
    browserAutomationReady: false,
    browserAutomationError: false,
    localhost: false,
    prerender: false,
    pageViewsInWindow: 0,
    reloadsInWindow: 0,
    verifiedBot: false
  };
}

export function createAdTrafficGuard(
  partialConfig: Partial<AdTrafficGuardConfig> = {}
): AdTrafficGuardController {
  let config = mergeAdTrafficGuardConfig(partialConfig);
  const listeners = new Set<(result: AdEligibilityResult) => void>();

  let started = false;
  let startedAt = 0;
  let visibleStartedAt: number | null = null;
  let accumulatedVisibleMs = 0;
  let hadTrustedInteraction = false;
  let browserAutomation = false;
  let browserAutomationReady = Boolean(config.skipBrowserAutomationDetection);
  let browserAutomationError = false;
  let interval: ReturnType<typeof setInterval> | null = null;
  let snapshot: AdEligibilityResult = {
    status: "waiting",
    allowed: false,
    risk: "uncertain",
    score: 35,
    reason: "initializing",
    signals: initialSignals()
  };

  const nowVisibleMs = (now = Date.now()) =>
    accumulatedVisibleMs +
    (visibleStartedAt === null ? 0 : Math.max(0, now - visibleStartedAt));

  const collectSignals = (): AdEligibilitySignals => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return initialSignals();
    }

    const now = Date.now();
    const frequency = readTrafficFrequency(
      config.storageKey,
      config.frequencyWindowMs,
      now
    );
    const cookieKnownBot =
      config.readKnownCrawlerCookie === false ? false : readKnownCrawlerCookie();

    return {
      elapsedMs: Math.max(0, now - startedAt),
      visibleMs: nowVisibleMs(now),
      pageVisible: document.visibilityState === "visible",
      pageFocused: document.hasFocus(),
      hadTrustedInteraction,
      knownBot: cookieKnownBot,
      browserAutomation,
      browserAutomationReady,
      browserAutomationError,
      localhost: isLocalHost(window.location.hostname),
      prerender: isPrerendered(),
      verifiedBot: false,
      ...frequency
    };
  };

  const publish = () => {
    snapshot = evaluateAdEligibility(collectSignals(), config);
    for (const listener of listeners) listener(snapshot);

    if (snapshot.status !== "waiting" && interval) {
      clearInterval(interval);
      interval = null;
    }

    return snapshot;
  };

  const onVisibilityChange = () => {
    const now = Date.now();
    if (document.visibilityState === "visible") {
      if (visibleStartedAt === null) visibleStartedAt = now;
    } else if (visibleStartedAt !== null) {
      accumulatedVisibleMs += Math.max(0, now - visibleStartedAt);
      visibleStartedAt = null;
    }
    publish();
  };

  const onTrustedInteraction = (event: Event) => {
    if (event.isTrusted) {
      hadTrustedInteraction = true;
      publish();
    }
  };

  const interactionEvents: Array<keyof WindowEventMap> = [
    "pointerdown",
    "keydown",
    "touchstart",
    "scroll",
    "wheel"
  ];

  const runBrowserAutomationDetection = () => {
    if (config.skipBrowserAutomationDetection) {
      browserAutomationReady = true;
      browserAutomation = false;
      browserAutomationError = false;
      publish();
      return;
    }

    const detect =
      config.detectBrowserAutomation ?? getDefaultBrowserAutomationDetector();

    void detectBrowserAutomationWith(detect).then((result) => {
      browserAutomationReady = result.ready;
      browserAutomation = result.automation;
      browserAutomationError = result.error;
      publish();
    });
  };

  const start = () => {
    if (started || typeof window === "undefined" || typeof document === "undefined") {
      return;
    }
    started = true;
    startedAt = Date.now();
    accumulatedVisibleMs = 0;
    visibleStartedAt =
      document.visibilityState === "visible" ? startedAt : null;
    browserAutomation = false;
    browserAutomationReady = Boolean(config.skipBrowserAutomationDetection);
    browserAutomationError = false;

    recordPageView(config.storageKey, config.frequencyWindowMs, {
      isReload: isReloadNavigation(),
      now: startedAt
    });

    document.addEventListener("visibilitychange", onVisibilityChange, {
      passive: true
    });
    window.addEventListener("focus", publish, { passive: true });
    window.addEventListener("blur", publish, { passive: true });
    for (const eventName of interactionEvents) {
      window.addEventListener(eventName, onTrustedInteraction, { passive: true });
    }

    publish();
    runBrowserAutomationDetection();
    interval = setInterval(publish, config.evaluationIntervalMs);
  };

  const stop = () => {
    if (!started || typeof window === "undefined" || typeof document === "undefined") {
      return;
    }
    started = false;

    if (visibleStartedAt !== null) {
      accumulatedVisibleMs += Math.max(0, Date.now() - visibleStartedAt);
      visibleStartedAt = null;
    }

    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("focus", publish);
    window.removeEventListener("blur", publish);
    for (const eventName of interactionEvents) {
      window.removeEventListener(eventName, onTrustedInteraction);
    }
    if (interval) clearInterval(interval);
    interval = null;
  };

  return {
    start,
    stop,
    trackPageView() {
      if (typeof window === "undefined") return;
      recordPageView(config.storageKey, config.frequencyWindowMs);
      publish();
    },
    setExternalSignals(signals: ExternalAdTrafficSignals) {
      config = mergeAdTrafficGuardConfig({
        ...config,
        externalSignals: {
          ...config.externalSignals,
          ...signals
        }
      });
      publish();
    },
    evaluate: publish,
    getSnapshot() {
      return snapshot;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}

import type { BrowserAutomationDetector } from "../core/types.js";

export interface BrowserAutomationDetection {
  ready: boolean;
  automation: boolean;
  botKind?: string;
  error: boolean;
}

export async function detectBrowserAutomationWith(
  detect: BrowserAutomationDetector
): Promise<BrowserAutomationDetection> {
  try {
    const result = await detect();
    return {
      ready: true,
      automation: Boolean(result.bot),
      botKind: result.botKind,
      error: false
    };
  } catch {
    return {
      ready: true,
      automation: false,
      botKind: undefined,
      error: true
    };
  }
}

let botdLoadPromise: Promise<BrowserAutomationDetector> | null = null;

async function createBotdDetector(): Promise<BrowserAutomationDetector> {
  const { load } = await import("@fingerprintjs/botd");
  const botd = await load({ monitoring: false });
  return async () => {
    const result = botd.detect();
    if (result.bot) {
      return { bot: true, botKind: result.botKind };
    }
    return { bot: false };
  };
}

export function getDefaultBrowserAutomationDetector(): BrowserAutomationDetector {
  return async () => {
    if (!botdLoadPromise) {
      botdLoadPromise = createBotdDetector();
    }
    const detect = await botdLoadPromise;
    return detect();
  };
}

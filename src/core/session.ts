interface StoredTrafficState {
  pageViews: number[];
  reloads: number[];
}

function emptyState(): StoredTrafficState {
  return { pageViews: [], reloads: [] };
}

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function parseState(raw: string | null): StoredTrafficState {
  if (!raw) return emptyState();
  try {
    const value = JSON.parse(raw) as Partial<StoredTrafficState>;
    return {
      pageViews: Array.isArray(value.pageViews)
        ? value.pageViews.filter((v): v is number => typeof v === "number")
        : [],
      reloads: Array.isArray(value.reloads)
        ? value.reloads.filter((v): v is number => typeof v === "number")
        : []
    };
  } catch {
    return emptyState();
  }
}

function prune(values: number[], now: number, windowMs: number): number[] {
  const cutoff = now - windowMs;
  return values.filter((timestamp) => timestamp >= cutoff && timestamp <= now + 5_000);
}

export function readTrafficFrequency(
  storageKey: string,
  windowMs: number,
  now = Date.now()
): { pageViewsInWindow: number; reloadsInWindow: number } {
  const storage = getSessionStorage();
  if (!storage) return { pageViewsInWindow: 0, reloadsInWindow: 0 };

  const state = parseState(storage.getItem(storageKey));
  const pageViews = prune(state.pageViews, now, windowMs);
  const reloads = prune(state.reloads, now, windowMs);

  return {
    pageViewsInWindow: pageViews.length,
    reloadsInWindow: reloads.length
  };
}

export function recordPageView(
  storageKey: string,
  windowMs: number,
  options: { isReload?: boolean; now?: number } = {}
): void {
  const storage = getSessionStorage();
  if (!storage) return;

  const now = options.now ?? Date.now();
  const state = parseState(storage.getItem(storageKey));
  state.pageViews = [...prune(state.pageViews, now, windowMs), now];
  state.reloads = prune(state.reloads, now, windowMs);

  if (options.isReload) state.reloads.push(now);

  try {
    storage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Storage can be unavailable in private / hardened contexts. The guard
    // degrades gracefully to browser-local behavioral signals.
  }
}

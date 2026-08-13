"use client";

import { useEffect } from "react";
import { useAdEligibility } from "./useAdEligibility.js";

export interface AdSenseLoaderProps {
  client: `ca-pub-${string}` | string;
  /**
   * Separate consent gate. Keep this false until your CMP says loading the
   * relevant Google advertising storage/scripts is permitted.
   */
  consentGranted?: boolean;
  /** Additional external switch for site-level monetization settings. */
  enabled?: boolean;
  onLoad?: () => void;
  onError?: (event: Event | string) => void;
}

const ADSENSE_SRC = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";

export function AdSenseLoader({
  client,
  consentGranted = true,
  enabled = true,
  onLoad,
  onError
}: AdSenseLoaderProps) {
  const { result } = useAdEligibility();

  useEffect(() => {
    if (!enabled || !consentGranted || !result.allowed) return;

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]'
    );

    if (existing) {
      if (existing.dataset.atgLoaded === "true") onLoad?.();
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = `${ADSENSE_SRC}?client=${encodeURIComponent(client)}`;
    script.dataset.adTrafficGuard = "true";

    const handleLoad = () => {
      script.dataset.atgLoaded = "true";
      window.dispatchEvent(new CustomEvent("adtrafficguard:adsense-ready"));
      onLoad?.();
    };
    const handleError = (event: Event | string) => onError?.(event);

    script.addEventListener("load", handleLoad);
    script.addEventListener("error", handleError);
    document.head.appendChild(script);

    return () => {
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
      // Deliberately do not remove AdSense after it has loaded. Route changes in
      // SPA apps should reuse the one SDK instance.
    };
  }, [client, consentGranted, enabled, onError, onLoad, result.allowed]);

  return null;
}

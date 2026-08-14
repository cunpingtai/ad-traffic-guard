"use client";

import {
  type CSSProperties,
  type HTMLAttributes,
  useEffect,
  useRef
} from "react";
import { useAdEligibility } from "./useAdEligibility.js";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

export interface LazyAdSlotProps
  extends Omit<HTMLAttributes<HTMLModElement>, "children"> {
  client: `ca-pub-${string}` | string;
  slot: string;
  format?: string;
  fullWidthResponsive?: boolean;
  rootMargin?: string;
  /**
   * When true, push as soon as eligible (no IntersectionObserver).
   * Defaults to true while the package runs in passthrough mode.
   */
  eager?: boolean;
  enabled?: boolean;
  consentGranted?: boolean;
  style?: CSSProperties;
}

export function LazyAdSlot({
  client,
  slot,
  format = "auto",
  fullWidthResponsive = true,
  rootMargin = "800px 0px",
  eager,
  enabled = true,
  consentGranted = true,
  className = "adsbygoogle",
  style = { display: "block" },
  ...rest
}: LazyAdSlotProps) {
  const { result } = useAdEligibility();
  const ref = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const shouldEager = eager ?? result.reason === "passthrough";

  useEffect(() => {
    if (!enabled || !consentGranted || !result.allowed || pushed.current) return;
    const element = ref.current;
    if (!element) return;

    const push = () => {
      if (pushed.current) return;
      pushed.current = true;
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        // Ad blockers or CSP can prevent the SDK from initializing. Keep the
        // content experience working rather than throwing into the app tree.
      }
    };

    // Passthrough / eager: load immediately so above-the-fold and Auto-adjacent
    // manual units are not missed after scroll-gated eligibility.
    if (shouldEager || !("IntersectionObserver" in window)) {
      push();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          push();
        }
      },
      { rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [consentGranted, enabled, result.allowed, rootMargin, shouldEager]);

  return (
    <ins
      {...rest}
      ref={ref}
      className={className}
      style={style}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={fullWidthResponsive ? "true" : "false"}
    />
  );
}

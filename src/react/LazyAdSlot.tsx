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
  enabled = true,
  consentGranted = true,
  className = "adsbygoogle",
  style = { display: "block" },
  ...rest
}: LazyAdSlotProps) {
  const { result } = useAdEligibility();
  const ref = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

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

    if (!("IntersectionObserver" in window)) {
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
  }, [consentGranted, enabled, result.allowed, rootMargin]);

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

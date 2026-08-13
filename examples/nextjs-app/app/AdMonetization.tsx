"use client";

import { usePathname } from "next/navigation";
import {
  AdSenseLoader,
  AdTrafficGuardProvider,
  LazyAdSlot
} from "@cunpingtai/ad-traffic-guard/react";

const ADSENSE_CLIENT = "ca-pub-XXXXXXXXXXXXXXXX";

export function AdMonetization({
  children,
  knownBot = false,
  cfBotScore
}: {
  children: React.ReactNode;
  knownBot?: boolean;
  cfBotScore?: number;
}) {
  const pathname = usePathname();
  const consentGranted = true; // Replace with your CMP state.

  return (
    <AdTrafficGuardProvider
      routeKey={pathname}
      externalSignals={{ knownBot, cfBotScore }}
    >
      <AdSenseLoader
        client={ADSENSE_CLIENT}
        consentGranted={consentGranted}
      />
      {children}
      <LazyAdSlot
        client={ADSENSE_CLIENT}
        slot="1234567890"
        consentGranted={consentGranted}
      />
    </AdTrafficGuardProvider>
  );
}

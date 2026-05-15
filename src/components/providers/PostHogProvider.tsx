"use client";

import { useEffect, Suspense, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { identifyUser, resetUser } from "@/lib/posthog-events";

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname && posthog) {
      let url = window.origin + pathname;
      if (searchParams.toString()) {
        url = url + "?" + searchParams.toString();
      }
      posthog.capture("$pageview", { $current_url: url });
    }
  }, [pathname, searchParams]);

  return null;
}

/**
 * Watches the NextAuth session and calls posthog.identify() / posthog.reset()
 * so events attach to the right Person record. Anonymous events (landing
 * page pageviews etc.) are aliased to the user on first identify(), so the
 * funnel stays intact from "first visit" through "signed-in usage".
 *
 * We use a ref to track the last identified userId and avoid re-identifying
 * on every session re-render — identify() is idempotent but capture spam is
 * still spam.
 */
function PostHogSessionSync() {
  const { data: session, status } = useSession();
  const lastIdentifiedId = useRef<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    const userId = session?.user?.id;
    const tier = session?.user?.tier ?? "FREE";

    if (userId) {
      if (lastIdentifiedId.current !== userId) {
        // We don't yet expose isBetaUser on the session (CreditsProvider
        // tracks it, but that's per-route, not global). Default to false;
        // the call sites for trackZeroBalanceDialogShown / trackCreditBalanceLow
        // pass the live value explicitly.
        identifyUser(userId, { tier, isBetaUser: false });
        lastIdentifiedId.current = userId;
      }
    } else if (lastIdentifiedId.current !== null) {
      // User signed out — clear so subsequent anonymous events on this
      // browser aren't attributed to the previous user.
      resetUser();
      lastIdentifiedId.current = null;
    }
  }, [session, status]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN as string, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      capture_pageview: false, // Manually captured via PostHogPageView for App Router
    });
  }, []);

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      <PostHogSessionSync />
      {children}
    </PHProvider>
  );
}

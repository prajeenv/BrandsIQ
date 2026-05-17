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
 * The dedupe key is `userId:tier:isBetaUser` rather than just userId — when
 * tier or isBetaUser change (e.g. founder grants beta access after sign-in),
 * we re-identify so the Person record reflects the new state. Without this,
 * the initial identify wins and subsequent property changes never make it to
 * PostHog. (This was the bug fixed in the PR that introduced this comment.)
 */
function PostHogSessionSync() {
  const { data: session, status } = useSession();
  const lastIdentifiedStateRef = useRef<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    const userId = session?.user?.id;
    const tier = session?.user?.tier ?? "FREE";
    const isBetaUser = session?.user?.isBetaUser ?? false;

    if (userId) {
      // Re-identify whenever any tracked attribute changes, not just on
      // user-id change. Cheap (one identify call per change) and keeps
      // PostHog's Person record in sync.
      const stateKey = `${userId}:${tier}:${isBetaUser}`;
      if (lastIdentifiedStateRef.current !== stateKey) {
        identifyUser(userId, { tier, isBetaUser });
        lastIdentifiedStateRef.current = stateKey;
      }
    } else if (lastIdentifiedStateRef.current !== null) {
      // User signed out — clear so subsequent anonymous events on this
      // browser aren't attributed to the previous user.
      resetUser();
      lastIdentifiedStateRef.current = null;
    }
  }, [session, status]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN as string, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      capture_pageview: false, // Manually captured via PostHogPageView for App Router
      // Explicit Person profile policy: only create/update Person records for
      // users we've called identify() on. Default in posthog-js v1.117+ but
      // worth being explicit so future PostHog version bumps don't silently
      // change behaviour. Our identify() call lives in PostHogSessionSync
      // below — anonymous traffic stays anonymous, authenticated users get
      // a full Person record with tier + isBetaUser.
      person_profiles: "identified_only",
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

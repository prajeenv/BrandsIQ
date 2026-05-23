"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Dashboard banner that warns the user when their brand voice configuration
 * has a feature turned on but is missing a prerequisite.
 *
 * Today the only configured warning is "negative-review email toggle is ON
 * but `replyToEmail` is empty" — the AI prompt builder defends against this
 * (it skips the framing instruction entirely) but the user thinks they
 * configured the feature. Without this banner the only feedback they get is
 * a soft hint deep inside the brand voice page, which they may not revisit.
 *
 * Dismissal is per-warning, stored in `localStorage` with a 7-day TTL keyed
 * by user ID. After 7 days the warning re-appears so a long-running broken
 * config eventually gets noticed again. This is the market-standard pattern
 * for "important but not blocking" feedback.
 */

const LOCALSTORAGE_KEY_PREFIX = "bv-incomplete-banner-dismissed";
const DISMISSAL_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface BrandVoiceIncompleteBannerProps {
  userId: string | null | undefined;
  warning: "negativeEmailToggleOnButReplyToEmailMissing" | null;
}

/**
 * Read the persisted dismissal state synchronously. Returning the value
 * from a lazy initializer (rather than reading it in an effect) means the
 * first render already reflects the right state — no banner flash on
 * reload for already-dismissed warnings, and no "nothing renders for one
 * tick" race for testing or first-paint perf.
 */
function readDismissed(
  userId: string | null | undefined,
  warning: BrandVoiceIncompleteBannerProps["warning"],
): boolean {
  if (typeof window === "undefined" || !userId || !warning) return false;
  try {
    const key = `${LOCALSTORAGE_KEY_PREFIX}:${warning}:${userId}`;
    const raw = window.localStorage.getItem(key);
    if (!raw) return false;
    const dismissedAt = Number.parseInt(raw, 10);
    if (Number.isNaN(dismissedAt)) return false;
    return Date.now() - dismissedAt <= DISMISSAL_TTL_MS;
  } catch {
    // localStorage unavailable (private browsing, SSR slip-through, etc.)
    // — fall back to showing the banner. Better an extra banner than a
    // silently broken config.
    return false;
  }
}

export function BrandVoiceIncompleteBanner({
  userId,
  warning,
}: BrandVoiceIncompleteBannerProps) {
  const [isDismissed, setIsDismissed] = useState<boolean>(() =>
    readDismissed(userId, warning),
  );

  // Re-evaluate dismissal if userId or warning change after mount (rare
  // — usually a remount on auth swap — but handled for correctness).
  useEffect(() => {
    setIsDismissed(readDismissed(userId, warning));
  }, [userId, warning]);

  const handleDismiss = () => {
    if (!userId || !warning) return;
    try {
      const key = `${LOCALSTORAGE_KEY_PREFIX}:${warning}:${userId}`;
      window.localStorage.setItem(key, String(Date.now()));
    } catch {
      // Swallow — dismissal won't persist across the next dashboard
      // visit, which is acceptable. The user can dismiss again.
    }
    setIsDismissed(true);
  };

  if (!warning || !userId || isDismissed) return null;

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-lg border border-yellow-500/60 bg-yellow-500/10 p-4"
    >
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-700" />
      <div className="flex-1 space-y-1">
        <p className="text-sm font-semibold text-yellow-900">
          Negative-review email invitations are dormant
        </p>
        <p className="text-sm text-yellow-900/80">
          Your brand voice has email invitations on but no reply-to email
          configured. AI responses won&apos;t include the email until you fix
          this.
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button asChild size="sm" variant="outline" className="bg-card">
            {/* Deep-link to the Negative-review email sub-block anchor in
                ContactSignoffSection so the user lands on the broken
                control rather than the top of the brand voice page. */}
            <Link href="/dashboard/settings/brand-voice#negative-review-email">
              Open brand voice
            </Link>
          </Button>
        </div>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="rounded-md p-1 text-yellow-900/70 transition-colors hover:bg-yellow-500/10 hover:text-yellow-900"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, Calendar } from "lucide-react";
import { trackZeroBalanceDialogShown } from "@/lib/posthog-events";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FounderInquiryForm } from "@/components/shared/FounderInquiryForm";
import { getNextResetDate } from "@/lib/utils";
import type { SystemPhase } from "@/lib/system-phase";

interface OutOfCreditsDialogProps {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  creditsRemaining: number;
  creditsTotal: number;
  resetDate?: string;
  actionType?: "generate" | "regenerate";
  // MVP Phase 1: phase-aware CTAs per MVP.md Section 12.4.
  // Optional with sensible defaults so the dialog stays backward-compatible
  // for any pre-iteration-2 call sites.
  currentPhase?: SystemPhase;
  isBetaUser?: boolean;
  // tier is used for PostHog segmentation on zero_balance_dialog_shown
  // and reserved for Phase 2 tier-specific dialog copy. Optional with a
  // safe "FREE" default so pre-iteration-2 call sites still compile.
  tier?: string;
  // Pre-fill submitter info for FounderInquiryForm. When all three are
  // provided we hide the submitter fields entirely — the user has already
  // given us this info at signup/onboarding. Callers in the dashboard
  // layout typically source these from session + CreditsProvider.
  submitterName?: string | null;
  submitterEmail?: string | null;
  submitterBusinessName?: string | null;
}

export function OutOfCreditsDialog({
  open,
  onOpenChange,
  creditsRemaining,
  creditsTotal,
  resetDate,
  actionType = "generate",
  currentPhase = "phase_2",
  isBetaUser = false,
  tier = "FREE",
  submitterName,
  submitterEmail,
  submitterBusinessName,
}: OutOfCreditsDialogProps) {
  // PostHog: zero_balance_dialog_shown. Fires once per dialog opening
  // (when `open` flips from false → true). The dependency array deliberately
  // omits `tier`/`isBetaUser` so re-renders with the same `open=true` don't
  // re-fire. Edge: if a parent re-mounts the dialog with open=true on
  // initial render we'll emit once — correct.
  useEffect(() => {
    if (open) {
      trackZeroBalanceDialogShown({ tier, isBetaUser });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  // Hide submitter fields when we have what we need from session/onboarding.
  // We require name + email at minimum; business name is allowed to be null
  // (a user who somehow lands here without finishing onboarding still gets
  // their name+email pre-filled and just types business name themselves).
  const canHideSubmitterFields = Boolean(submitterName && submitterEmail);
  const nextResetDate = getNextResetDate(resetDate);
  const formattedResetDate = nextResetDate
    ? nextResetDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const actionText = actionType === "regenerate" ? "Regeneration" : "Response generation";

  // Two visual states inside the same dialog: the "out of credits" summary
  // and the inquiry form. Swapping content avoids stacking two dialogs.
  const [view, setView] = useState<"summary" | "inquiry">("summary");

  // Reset view back to summary whenever the dialog closes, so the next open
  // starts from the summary panel rather than mid-form.
  const handleOpenChange = (next: boolean) => {
    if (!next) setView("summary");
    onOpenChange(next);
  };

  // Resolve which Phase-1 inquiry path applies:
  //   beta user (any tier) → request more credits
  //   non-beta user → request beta access
  // (In Phase 2 we wouldn't use this path at all — we'd link to /pricing.)
  const inquiryType: "more_credits" | "beta_request" = isBetaUser
    ? "more_credits"
    : "beta_request";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {view === "summary" ? (
          <>
            <DialogHeader>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <CreditCard className="h-6 w-6 text-destructive" />
              </div>
              <DialogTitle className="text-center">
                You&apos;re out of response credits
              </DialogTitle>
              <DialogDescription className="text-center">
                {actionText} requires 1 credit, but you have none remaining.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm text-muted-foreground">Credits remaining</span>
                <span className="font-semibold">
                  {creditsRemaining} of {creditsTotal}
                </span>
              </div>

              {formattedResetDate && (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Resets on
                  </span>
                  <span className="font-semibold">{formattedResetDate}</span>
                </div>
              )}
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-col">
              {currentPhase === "phase_1" ? (
                <Button
                  className="w-full"
                  onClick={() => setView("inquiry")}
                >
                  {inquiryType === "more_credits"
                    ? "Request more credits"
                    : "Request beta access"}
                </Button>
              ) : (
                <Button asChild className="w-full">
                  <Link href="/pricing">Upgrade Plan</Link>
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <FounderInquiryForm
              type={inquiryType}
              source="zero_balance"
              defaultName={submitterName ?? null}
              defaultEmail={submitterEmail ?? null}
              defaultBusinessName={submitterBusinessName ?? null}
              hideSubmitterFields={canHideSubmitterFields}
              onSuccess={() => {
                // Auto-close shortly after the success card renders so the
                // user sees confirmation, not a stuck modal.
                setTimeout(() => handleOpenChange(false), 1800);
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setView("summary")}
            >
              ← Back
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export type { OutOfCreditsDialogProps };

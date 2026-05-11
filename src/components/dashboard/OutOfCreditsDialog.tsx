"use client";

import { useState } from "react";
import Link from "next/link";
import { CreditCard, Calendar } from "lucide-react";
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
  // tier is reserved for Phase 2 ("Starter / Growth") tier-specific copy.
  // Accepted but ignored under phase_1; renamed _tier to satisfy the linter.
  _tier?: string;
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
}: OutOfCreditsDialogProps) {
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
              hideSubmitterFields={false}
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

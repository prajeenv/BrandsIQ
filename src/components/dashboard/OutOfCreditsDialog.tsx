"use client";

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
import { getNextResetDate } from "@/lib/utils";

interface OutOfCreditsDialogProps {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  creditsRemaining: number;
  creditsTotal: number;
  resetDate?: string;
  actionType?: "generate" | "regenerate";
}

export function OutOfCreditsDialog({
  open,
  onOpenChange,
  creditsRemaining,
  creditsTotal,
  resetDate,
  actionType = "generate",
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <CreditCard className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center">You&apos;re out of response credits</DialogTitle>
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
          <Button asChild className="w-full">
            <Link href="/pricing">Upgrade Plan</Link>
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

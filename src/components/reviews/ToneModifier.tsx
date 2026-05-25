"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles } from "lucide-react";

/**
 * Regenerate dialog.
 *
 * 5/25 simplification — the per-regeneration tone selector was removed.
 *
 * The previous version of this dialog let users override the brand voice
 * tone for a single regeneration. In practice, businesses set a brand
 * voice tone once and keep it stable; the per-regeneration override was
 * duplicating a setting that already exists on the brand voice page. The
 * one legitimate edge case (tonally mismatched review where the manager
 * wants to break brand voice for one reply) is served just as well by
 * the Additional Instructions textarea ("respond more warmly for this
 * one") with even more flexibility than picking a preset.
 *
 * What stays:
 *  - Additional Instructions textarea (free text, 500 char cap, single-
 *    use, not persisted). Wrapped via the sanitize helper before
 *    injection into the user prompt (see claude.ts customRegenerate-
 *    Instructions slot).
 *  - Brand voice tone applies as configured. No user input on tone in
 *    this dialog.
 */

export const ADDITIONAL_INSTRUCTIONS_MAX = 500;

interface ToneModifierProps {
  onRegenerate: (_payload: {
    additionalInstructions?: string;
  }) => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
  creditsNeeded?: number;
}

export function ToneModifier({
  onRegenerate,
  isLoading = false,
  disabled = false,
  creditsNeeded = 1.0,
}: ToneModifierProps) {
  const [open, setOpen] = useState(false);
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const instructionsRef = useRef<HTMLTextAreaElement>(null);

  const handleRegenerate = async () => {
    const trimmed = additionalInstructions.trim();
    await onRegenerate({
      additionalInstructions: trimmed.length > 0 ? trimmed : undefined,
    });
    setOpen(false);
    // Spec §8.2: clear the additional instructions after each regeneration —
    // not persisted, single-use per turn.
    setAdditionalInstructions("");
  };

  const charsRemaining = ADDITIONAL_INSTRUCTIONS_MAX - additionalInstructions.length;
  const isOverLimit = charsRemaining < 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || isLoading}
          className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {isLoading ? "Regenerating..." : "Regenerate"}
        </Button>
      </DialogTrigger>
      {/*
        Dialog sizing after tone-selector removal:
          - `sm:max-w-2xl` retained — the textarea reads better with width.
          - No more `max-h-[90vh] flex flex-col flex-1 overflow-y-auto` —
            without the tone grid the dialog content is short enough to
            never overflow a typical viewport. Removed the scrollable
            body region entirely.
      */}
      <DialogContent
        className="sm:max-w-2xl"
        onOpenAutoFocus={(event) => {
          // Default Radix behaviour focuses the first focusable element
          // (the Close × in the corner). Override to put the cursor in
          // the Additional instructions textarea — the only input on
          // this dialog.
          event.preventDefault();
          instructionsRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Regenerate response</DialogTitle>
          <DialogDescription>Apply just for this regeneration.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="additional-instructions" className="text-sm font-medium">
            Additional instructions (optional)
          </Label>
          <p className="text-xs text-muted-foreground">
            Anything specific you want this response to mention or address.
          </p>
          <Textarea
            id="additional-instructions"
            ref={instructionsRef}
            value={additionalInstructions}
            onChange={(e) => setAdditionalInstructions(e.target.value)}
            maxLength={ADDITIONAL_INSTRUCTIONS_MAX}
            rows={3}
            placeholder='e.g. "mention our loyalty program" or "address the dessert complaint specifically"'
            className="resize-none"
          />
          <p
            className={`text-xs ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}
          >
            {additionalInstructions.length} / {ADDITIONAL_INSTRUCTIONS_MAX} characters
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <p className="text-xs text-muted-foreground mr-auto">
            This will use {creditsNeeded} credit{creditsNeeded !== 1 ? "s" : ""}
          </p>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleRegenerate} disabled={isLoading || isOverLimit}>
            {isLoading ? "Regenerating..." : "Regenerate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

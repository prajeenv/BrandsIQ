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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Briefcase, Smile, Heart, Coffee } from "lucide-react";
import {
  BRAND_VOICE_TONES_V2,
  BRAND_VOICE_TONE_INFO_V2,
  type BrandVoiceToneV2,
} from "@/lib/constants";

/**
 * Regenerate dialog (iter 6).
 *
 * Spec §8.1 — the tone-modifier presets now match the four V2 brand voice
 * tones exactly (`warm_casual`, `friendly_professional`, `polished_formal`,
 * `empathetic_attentive`). The legacy `apologetic` option is dropped
 * because (a) it duplicated the empathetic preset semantically and (b) the
 * iter-4 prompt builder treats apology as content-routed via the structure
 * templates, not as a register.
 *
 * Spec §8.2 — a new "Additional instructions" textarea (free text, 500
 * char cap, single-use, not persisted) lets the user attach a per-
 * regeneration directive like "mention our loyalty program once" or
 * "address the dessert complaint specifically". The value is sent in the
 * regenerate request body as `additionalInstructions` and forwarded to
 * the iter-1 `customRegenerateInstructions` slot on `claude.ts`, which
 * wraps it via the sanitize helper before injecting into the user prompt.
 */
const TONE_ICONS: Record<BrandVoiceToneV2, React.ReactNode> = {
  warm_casual: <Coffee className="h-4 w-4" />,
  friendly_professional: <Smile className="h-4 w-4" />,
  polished_formal: <Briefcase className="h-4 w-4" />,
  empathetic_attentive: <Heart className="h-4 w-4" />,
};

export const ADDITIONAL_INSTRUCTIONS_MAX = 500;

interface ToneModifierProps {
  onRegenerate: (_payload: {
    tone: BrandVoiceToneV2;
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
  const [selectedTone, setSelectedTone] = useState<BrandVoiceToneV2>("friendly_professional");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const instructionsRef = useRef<HTMLTextAreaElement>(null);

  const handleRegenerate = async () => {
    const trimmed = additionalInstructions.trim();
    await onRegenerate({
      tone: selectedTone,
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
        Dialog sizing:
          - `sm:max-w-2xl` widens the dialog at tablet+ so the 2-col tone
            grid has room to breathe without forcing the descriptions to
            wrap aggressively.
          - `max-h-[90vh]` caps the overall height to 90% of the viewport
            so the dialog never overflows on short screens. Combined with
            `flex flex-col` on the content and `flex-1 overflow-y-auto`
            on the body region, the header + footer stay anchored while
            the tone grid + additional-instructions block scroll internally
            when needed.
      */}
      {/*
        Iter 6 follow-up — the description text was trimmed from a two-line
        wordy summary to a single short scope note, the "Current tone" line
        was removed (it was rarely useful and ate vertical space), and the
        field order was swapped so the more-commonly-used Additional
        instructions textarea sits above the tone grid and is autofocused
        when the dialog opens. The tone grid now sits below the textarea
        but most of it is still above the fold on a typical viewport.
      */}
      <DialogContent
        className="flex max-h-[90vh] flex-col sm:max-w-2xl"
        onOpenAutoFocus={(event) => {
          // Default Radix behaviour focuses the first focusable element
          // (which would be the Close × in the corner). Override to put
          // the cursor in the Additional instructions textarea — the
          // primary input for this dialog.
          event.preventDefault();
          instructionsRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Regenerate response</DialogTitle>
          <DialogDescription>Apply just for this regeneration.</DialogDescription>
        </DialogHeader>

        {/* Scrollable body: header + footer stay fixed; this region scrolls
            internally when content exceeds the viewport-capped dialog height.
            Padding notes:
              - `pb-4` (no `pt-`) — the DialogContent's parent `gap-4` already
                gives breathing room between the header and this region; an
                extra `pt-4` here doubled the gap.
              - `px-1` — small horizontal padding so the textarea/grid focus
                rings don't get clipped by the dialog's outer p-6 edge. */}
        <div className="flex-1 space-y-5 overflow-y-auto pb-4 px-1">
          {/* Additional instructions — free text. Iter 6 follow-up: hoisted
              above the tone grid because typing instructions is the more
              common path; autofocused on dialog open via onOpenAutoFocus. */}
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

          {/* Tone modifier — V2 4-key set, rendered as a 2-col grid at sm+ */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Change the tone for this response (optional)</Label>
            <p className="text-xs text-muted-foreground">
              Pick a different tone to use just for this regeneration.
            </p>
            <RadioGroup
              value={selectedTone}
              onValueChange={(value) => setSelectedTone(value as BrandVoiceToneV2)}
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              {BRAND_VOICE_TONES_V2.map((tone) => {
                const info = BRAND_VOICE_TONE_INFO_V2[tone];
                const isSelected = selectedTone === tone;
                return (
                  <div
                    key={tone}
                    className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent ${
                      isSelected ? "border-primary bg-accent/50" : "border-border"
                    }`}
                    onClick={() => setSelectedTone(tone)}
                  >
                    <RadioGroupItem value={tone} id={`tone-${tone}`} className="mt-1" />
                    <div className="flex-1">
                      <Label
                        htmlFor={`tone-${tone}`}
                        className="flex items-center gap-2 cursor-pointer font-medium"
                      >
                        {TONE_ICONS[tone]}
                        {info.label}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">{info.description}</p>
                    </div>
                  </div>
                );
              })}
            </RadioGroup>
          </div>
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

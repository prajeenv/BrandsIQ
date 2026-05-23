"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
  BRAND_VOICE_LIMITS_V2,
  NEGATIVE_REVIEW_FRAMINGS,
  type NegativeReviewFraming,
} from "@/lib/constants";
import { ExampleChips } from "./ExampleChips";

/**
 * Contact & sign-off section of the V2 brand voice form (iter 6).
 *
 * Spec §7. Four controls:
 *   §7.1 Salutation pattern with `{firstName}` variable + suggested chips.
 *   §7.2 Sign-off (multi-line) + suggested chips.
 *   §7.3 Negative-review email invitation toggle.
 *   §7.4 Framing radio + custom textarea (only visible when 7.3 is ON).
 *   §7.5 Reply-to email + soft warning when toggle is ON but email is empty
 *        (only visible when 7.3 is ON).
 *
 * The salutation, sign-off, and reply-to email are applied during iter 5's
 * post-processing — they never enter the AI prompt directly.
 */

const SALUTATION_CHIPS: readonly string[] = [
  "Dear {firstName},",
  "Hi {firstName},",
  "Hello {firstName},",
  "Hello,",
];

const SIGNOFF_CHIPS: readonly string[] = [
  "Warmest regards,\nThe Team",
  "With thanks,\nThe Manager",
  "Kind regards,\nThe Team",
  "Best wishes,\nThe Team",
];

const FRAMING_LABELS: Record<NegativeReviewFraming, { label: string; description: string }> = {
  management_contact: {
    label: "Promise that management will contact the customer",
    description:
      'Example: "A member of our management team would like to look into this with you directly. Please email [your email] with your booking details and we\'ll be in touch."',
  },
  investigation: {
    label: "Ask for booking details so we can investigate (Recommended)",
    description:
      'Example: "We\'d like to look into your experience further. Please send your booking details to [your email] so we can follow up properly."',
  },
  open_channel: {
    label: "Simply provide it as a way to follow up",
    description:
      'Example: "If you\'d like to discuss this further, please don\'t hesitate to contact us at [your email]."',
  },
  custom: {
    label: "Custom instructions",
    description: "For brands with specific phrasing or obligations.",
  },
};

interface ContactSignoffSectionProps {
  salutationPattern: string;
  signoffLines: string;
  negativeReviewEmailEnabled: boolean;
  negativeReviewFraming: NegativeReviewFraming;
  negativeReviewFramingCustom: string | null;
  replyToEmail: string | null;
  onSalutationPatternChange: (_value: string) => void;
  onSignoffLinesChange: (_value: string) => void;
  onNegativeReviewEmailEnabledChange: (_value: boolean) => void;
  onNegativeReviewFramingChange: (_value: NegativeReviewFraming) => void;
  onNegativeReviewFramingCustomChange: (_value: string) => void;
  onReplyToEmailChange: (_value: string) => void;
  disabled?: boolean;
}

export function ContactSignoffSection({
  salutationPattern,
  signoffLines,
  negativeReviewEmailEnabled,
  negativeReviewFraming,
  negativeReviewFramingCustom,
  replyToEmail,
  onSalutationPatternChange,
  onSignoffLinesChange,
  onNegativeReviewEmailEnabledChange,
  onNegativeReviewFramingChange,
  onNegativeReviewFramingCustomChange,
  onReplyToEmailChange,
  disabled,
}: ContactSignoffSectionProps) {
  // Spec §7.5: soft warning — toggle on AND email empty/whitespace-only.
  // Non-blocking; save still proceeds. The form's auto-save flow doesn't
  // change — this just surfaces an inline hint near the email input.
  //
  // Incomplete-config feedback: the same condition drives an "Incomplete"
  // pill next to the Negative-review email sub-block header in addition
  // to the existing inline hint near the email field. (The top-of-section
  // banner was removed in the trim pass — three signals were too many.)
  const isEmailConfigIncomplete =
    negativeReviewEmailEnabled && (replyToEmail == null || replyToEmail.trim().length === 0);
  const showEmailMissingWarning = isEmailConfigIncomplete;

  return (
    <div className="space-y-6">

      {/* Sub-block 1: Greeting & closing (§7.1 + §7.2)
          Inner-contrast pass — each sub-block is now its own bordered
          container with a faint slate tint. Gives the two halves of this
          long section the same figure-on-ground read the section cards
          themselves have on the page surface. */}
      <div className="rounded-lg border border-slate-300 bg-slate-50/50 p-4 space-y-6">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Greeting & closing
          </p>
          <p className="text-xs text-muted-foreground">
            Applied to every response, regardless of rating.
          </p>
        </div>

        {/* §7.1 Salutation */}
        <div className="space-y-2">
          <Label htmlFor="salutation-pattern" className="text-sm font-medium">
            Salutation
          </Label>
          <p className="text-xs text-muted-foreground">
            How responses open. Use <code className="text-xs bg-muted px-1 py-0.5 rounded">{"{firstName}"}</code> to personalise.
          </p>
          <Input
            id="salutation-pattern"
            value={salutationPattern}
            onChange={(e) => onSalutationPatternChange(e.target.value)}
            maxLength={BRAND_VOICE_LIMITS_V2.SALUTATION_MAX}
            placeholder="Dear {firstName},"
            disabled={disabled}
            className="bg-card"
          />
          <ExampleChips
            label="Suggestions"
            items={SALUTATION_CHIPS}
            onPick={onSalutationPatternChange}
            disabled={disabled}
          />
        </div>

        {/* §7.2 Sign-off */}
        <div className="space-y-2">
          <Label htmlFor="signoff-lines" className="text-sm font-medium">
            Sign-off
          </Label>
          <p className="text-xs text-muted-foreground">
            How responses close. Press enter for a new line.
          </p>
          <Textarea
            id="signoff-lines"
            value={signoffLines}
            onChange={(e) => onSignoffLinesChange(e.target.value)}
            maxLength={BRAND_VOICE_LIMITS_V2.SIGNOFF_MAX}
            rows={3}
            placeholder={"Warmest regards,\nThe Team"}
            className="resize-none bg-card"
            disabled={disabled}
          />
          <ExampleChips
            label="Suggestions"
            items={SIGNOFF_CHIPS}
            onPick={onSignoffLinesChange}
            disabled={disabled}
            previewLines
          />
        </div>
      </div>

      {/* Sub-block 2: Negative-review email (§7.3 + §7.4 + §7.5)
          Own bordered container matching sub-block 1. The conditional
          framing reveal stays nested inside this block (with its own
          tighter border) so the user sees "toggle expanded into more
          controls within the same conceptual area".

          `id="negative-review-email"` makes this sub-block a deep-link
          target — the dashboard `BrandVoiceIncompleteBanner` CTA lands
          here directly so users with the incomplete config don't have
          to scroll-hunt to the right control. `scroll-mt-24` keeps it
          clear of the sticky dashboard header on hash navigation. */}
      <div
        id="negative-review-email"
        className="scroll-mt-24 rounded-lg border border-slate-300 bg-slate-50/50 p-4 space-y-4"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Negative-review email
            </p>
            {isEmailConfigIncomplete && (
              <span className="inline-flex items-center gap-1 rounded-full border border-yellow-600/40 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-yellow-700">
                <AlertCircle className="h-3 w-3" />
                Incomplete
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Optional. Only applies when the review is 1–2 stars or has negative sentiment.
          </p>
        </div>

        {/* §7.3 Negative-review email invitation toggle */}
        <div className="flex items-start justify-between gap-4 rounded-md border border-slate-300 bg-card p-4">
          <div className="flex-1 space-y-1">
            <Label htmlFor="neg-email-enabled" className="text-sm font-medium cursor-pointer">
              Invite customers to contact you via email
            </Label>
            <p className="text-xs text-muted-foreground">
              When a customer leaves a negative review (1–2 stars or negative sentiment), our AI will
              invite them to reach out via email so the conversation can continue privately.
            </p>
          </div>
          <Switch
            id="neg-email-enabled"
            checked={negativeReviewEmailEnabled}
            onCheckedChange={onNegativeReviewEmailEnabledChange}
            disabled={disabled}
          />
        </div>

        {/* §7.4 Framing radio + §7.5 Reply-to email — only when toggle is ON.
            Switched from `border-dashed bg-muted/30` (which read as nothing on
            the new white cards) to a proper solid-bordered white surface
            with a left accent so it visibly "emerged" from the toggle above. */}
        {negativeReviewEmailEnabled && (
          <div className="space-y-6 rounded-md border border-slate-300 border-l-2 border-l-primary/40 bg-card p-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                How should our AI frame the invitation?
              </Label>
              <p className="text-xs text-muted-foreground">
                Controls how the email is framed in negative review responses. Doesn&apos;t affect positive
                reviews — there, the email simply doesn&apos;t appear in the body.
              </p>
              <RadioGroup
                value={negativeReviewFraming}
                onValueChange={(v) => onNegativeReviewFramingChange(v as NegativeReviewFraming)}
                disabled={disabled}
                className="space-y-2"
              >
                {NEGATIVE_REVIEW_FRAMINGS.map((framing) => {
                  const info = FRAMING_LABELS[framing];
                  return (
                    <div key={framing} className="flex items-start gap-3">
                      <RadioGroupItem value={framing} id={`framing-${framing}`} className="mt-1" />
                      <div className="flex-1 space-y-1">
                        <Label htmlFor={`framing-${framing}`} className="text-sm font-medium cursor-pointer">
                          {info.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">{info.description}</p>
                      </div>
                    </div>
                  );
                })}
              </RadioGroup>

              {/* Custom framing textarea — only when 'custom' is selected */}
              {negativeReviewFraming === "custom" && (
                <div className="space-y-2 pl-7">
                  <Label htmlFor="framing-custom" className="text-xs font-medium">
                    Custom instructions
                  </Label>
                  <Textarea
                    id="framing-custom"
                    value={negativeReviewFramingCustom ?? ""}
                    onChange={(e) => onNegativeReviewFramingCustomChange(e.target.value)}
                    maxLength={BRAND_VOICE_LIMITS_V2.FRAMING_CUSTOM_MAX}
                    rows={3}
                    placeholder="For brands with specific phrasing or obligations…"
                    disabled={disabled}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    {(negativeReviewFramingCustom ?? "").length} / {BRAND_VOICE_LIMITS_V2.FRAMING_CUSTOM_MAX} characters
                  </p>
                </div>
              )}
            </div>

            {/* §7.5 Reply-to email */}
            <div className="space-y-2">
              <Label htmlFor="reply-to-email" className="text-sm font-medium">
                Reply-to email
              </Label>
              <p className="text-xs text-muted-foreground">
                The email address that will appear in the responses above.
              </p>
              <Input
                id="reply-to-email"
                type="email"
                value={replyToEmail ?? ""}
                onChange={(e) => onReplyToEmailChange(e.target.value)}
                maxLength={BRAND_VOICE_LIMITS_V2.REPLY_TO_EMAIL_MAX}
                placeholder="hello@yourbrand.com"
                disabled={disabled}
              />
              {showEmailMissingWarning && (
                <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/5">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-xs">
                    Add an email above or turn off the contact invitation. The toggle is on but no
                    email is configured.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

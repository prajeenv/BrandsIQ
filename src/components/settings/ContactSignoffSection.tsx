"use client";

import { useEffect, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AlertCircle, Globe } from "lucide-react";
import {
  BRAND_VOICE_LIMITS_V2,
  NEGATIVE_REVIEW_FRAMINGS,
  SUPPORTED_RESPONSE_LANGUAGES,
  type NegativeReviewFraming,
} from "@/lib/constants";
import { detectLanguage } from "@/lib/language-detection";
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

/**
 * 5/30 — chip suggestions vary by `salutationSignoffLanguage` (the
 * franc-detected or manually-picked language the user is typing their
 * customisation in). Each language with explicit chips below gets a
 * small list of register-appropriate examples; everything else falls
 * back to the English set via `getSalutationChips` / `getSignoffChips`.
 *
 * Maintenance note: when adding a language here, the matching default
 * (`salutation` + `signoff` + `noNameSalutation`) must also exist in
 * `src/lib/ai/language-contact-defaults.ts`. The two are conceptually
 * paired but intentionally not co-located — the defaults map is read
 * by the server-side post-processor (no React), and the chips are a
 * UI-side suggestion list (~4 entries per language, free to be more
 * varied than the single hand-authored default).
 */
const SALUTATION_CHIPS_BY_LANGUAGE: Record<string, readonly string[]> = {
  English: [
    "Dear {firstName},",
    "Hi {firstName},",
    "Hello {firstName},",
    "Hello,",
  ],
  Spanish: [
    "Estimado/a {firstName},",
    "Hola {firstName},",
    "Buenos días {firstName},",
    "Hola,",
  ],
  French: [
    "Cher/Chère {firstName},",
    "Bonjour {firstName},",
    "Madame, Monsieur,",
    "Bonjour,",
  ],
  German: [
    "Liebe/r {firstName},",
    "Sehr geehrte/r {firstName},",
    "Hallo {firstName},",
    "Hallo,",
  ],
  Italian: [
    "Caro/a {firstName},",
    "Salve {firstName},",
    "Buongiorno {firstName},",
    "Salve,",
  ],
  Portuguese: [
    "Caro/a {firstName},",
    "Olá {firstName},",
    "Bom dia {firstName},",
    "Olá,",
  ],
  Dutch: [
    "Beste {firstName},",
    "Hallo {firstName},",
    "Geachte {firstName},",
    "Hallo,",
  ],
  Japanese: [
    "{firstName}様、",
    "{firstName}さん、",
    "お客様、",
  ],
  "Chinese (Simplified)": [
    "亲爱的{firstName},",
    "尊敬的{firstName},",
    "您好,",
  ],
  Korean: [
    "{firstName}님께,",
    "{firstName}님 안녕하세요,",
    "안녕하세요,",
  ],
};

const SIGNOFF_CHIPS_BY_LANGUAGE: Record<string, readonly string[]> = {
  English: [
    "Warmest regards,\nThe Team",
    "With thanks,\nThe Manager",
    "Kind regards,\nThe Team",
    "Best wishes,\nThe Team",
  ],
  Spanish: [
    "Un cordial saludo,\nEl Equipo",
    "Saludos,\nEl Equipo",
    "Atentamente,\nLa Dirección",
  ],
  French: [
    "Cordialement,\nL'équipe",
    "Bien à vous,\nLa Direction",
    "Avec nos remerciements,\nL'équipe",
  ],
  German: [
    "Mit besten Grüßen,\nDas Team",
    "Freundliche Grüße,\nDas Team",
    "Herzlichen Dank,\nDas Management",
  ],
  Italian: [
    "Cordiali saluti,\nIl Team",
    "Con i nostri ringraziamenti,\nLa Direzione",
    "Distinti saluti,\nIl Team",
  ],
  Portuguese: [
    "Com os melhores cumprimentos,\nA Equipa",
    "Com os melhores cumprimentos,\nA Equipe",
    "Atenciosamente,\nA Direção",
  ],
  Dutch: [
    "Met vriendelijke groet,\nHet Team",
    "Met dank,\nDe Manager",
    "Hartelijke groeten,\nHet Team",
  ],
  Japanese: [
    "よろしくお願いいたします。\nチーム一同",
    "ありがとうございました。\n店長",
  ],
  "Chinese (Simplified)": [
    "此致\n团队敬上",
    "顺颂时祺,\n团队",
  ],
  Korean: [
    "감사합니다.\n팀 드림",
    "감사드립니다.\n매니저 올림",
  ],
};

/**
 * Resolve the chip list for the currently-typed-in language. Falls back
 * to English when the language has no explicit chips OR when the
 * language is null (franc-unclear state). Same fallback shape as
 * `getLanguageContactDefaults` server-side.
 */
function getSalutationChips(language: string | null): readonly string[] {
  if (language === null) return SALUTATION_CHIPS_BY_LANGUAGE.English;
  return SALUTATION_CHIPS_BY_LANGUAGE[language] ?? SALUTATION_CHIPS_BY_LANGUAGE.English;
}

function getSignoffChips(language: string | null): readonly string[] {
  if (language === null) return SIGNOFF_CHIPS_BY_LANGUAGE.English;
  return SIGNOFF_CHIPS_BY_LANGUAGE[language] ?? SIGNOFF_CHIPS_BY_LANGUAGE.English;
}

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
  /**
   * 5/30 — current language tag for the salutation/sign-off. Drives
   * which language's chip suggestions are shown, which defaults the
   * post-processor uses when generating in a different language, and
   * what the inline indicator displays. Null = franc was uncertain and
   * the user hasn't manually picked. See DECISIONS.md #107.
   */
  salutationSignoffLanguage: string | null;
  /**
   * True when the user has clicked the inline "Change" link and
   * explicitly picked a language. Stops the debounced franc detector
   * from silently overwriting the pick on subsequent edits. The form
   * also persists this flag locally so a "Re-detect" link can revert
   * to auto-detection.
   */
  salutationSignoffLanguageManuallyOverridden: boolean;
  onSalutationPatternChange: (_value: string) => void;
  onSignoffLinesChange: (_value: string) => void;
  onNegativeReviewEmailEnabledChange: (_value: boolean) => void;
  onNegativeReviewFramingChange: (_value: NegativeReviewFraming) => void;
  onNegativeReviewFramingCustomChange: (_value: string) => void;
  onReplyToEmailChange: (_value: string) => void;
  /**
   * Called when franc auto-detects a language OR when the user picks
   * one explicitly via the indicator's "Change" link. `manuallyOverridden`
   * is `false` for auto-detection runs and `true` for user picks. The
   * form decides whether to persist the value (true) or treat it as
   * transient (false but still saved so the resolver can use it).
   */
  onSalutationSignoffLanguageChange: (
    _value: string | null,
    _manuallyOverridden: boolean,
  ) => void;
  disabled?: boolean;
}

/**
 * Minimum combined salutation + sign-off length before franc detection
 * is attempted. Matches the floor franc-min itself uses (it returns
 * "und" below 10 chars), and mirrors `ReviewForm.tsx`'s same threshold.
 * Below this we don't even call franc — the indicator shows the
 * "unclear" state directly.
 */
const FRANC_MIN_LENGTH = 10;

/**
 * Debounce window for the franc detection effect — matches the review-
 * creation form's 500ms timer so the two surfaces feel consistent.
 */
const DETECTION_DEBOUNCE_MS = 500;

export function ContactSignoffSection({
  salutationPattern,
  signoffLines,
  negativeReviewEmailEnabled,
  negativeReviewFraming,
  negativeReviewFramingCustom,
  replyToEmail,
  salutationSignoffLanguage,
  salutationSignoffLanguageManuallyOverridden,
  onSalutationPatternChange,
  onSignoffLinesChange,
  onNegativeReviewEmailEnabledChange,
  onNegativeReviewFramingChange,
  onNegativeReviewFramingCustomChange,
  onReplyToEmailChange,
  onSalutationSignoffLanguageChange,
  disabled,
}: ContactSignoffSectionProps) {
  // 5/30 — debounced franc detection on the combined salutation +
  // sign-off string. Skipped entirely when the user has manually
  // overridden the language via the inline picker. Combined-text
  // length sets the floor: < 10 chars → indicator shows "unclear"
  // and stores null; >= 10 chars → franc runs.
  //
  // Mirrors the review-form's detection effect (see
  // ReviewForm.tsx:detectLanguageDebounced).
  const detectLanguageDebounced = useCallback(
    (combined: string) => {
      if (salutationSignoffLanguageManuallyOverridden) return;
      const trimmed = combined.trim();
      if (trimmed.length < FRANC_MIN_LENGTH) {
        onSalutationSignoffLanguageChange(null, false);
        return;
      }
      const result = detectLanguage(trimmed);
      // franc returns confidence: "low" when the result is below its
      // threshold. We treat low-confidence detection the same as the
      // "unclear" state so the user is nudged to confirm.
      if (result.confidence === "low") {
        onSalutationSignoffLanguageChange(null, false);
        return;
      }
      onSalutationSignoffLanguageChange(result.language, false);
    },
    [salutationSignoffLanguageManuallyOverridden, onSalutationSignoffLanguageChange],
  );

  useEffect(() => {
    const combined = `${salutationPattern}\n${signoffLines}`;
    const timeoutId = setTimeout(() => {
      detectLanguageDebounced(combined);
    }, DETECTION_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [salutationPattern, signoffLines, detectLanguageDebounced]);

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
            items={getSalutationChips(salutationSignoffLanguage)}
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
            items={getSignoffChips(salutationSignoffLanguage)}
            onPick={onSignoffLinesChange}
            disabled={disabled}
            previewLines
          />
        </div>

        {/* 5/30 — Language indicator. Below sign-off because it
            describes the language of BOTH the salutation and sign-off
            (franc runs on the combined string). When a language is
            detected/picked: small Globe + "Detected: <lang>" + Change
            link. When unclear: yellow alert + auto-revealed picker. */}
        <div className="space-y-2 border-t border-slate-300/60 pt-3 mt-1">
          {salutationSignoffLanguage !== null ? (
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              <span className="text-muted-foreground">
                {salutationSignoffLanguageManuallyOverridden ? "Set to:" : "Detected:"}{" "}
                <strong className="font-medium text-foreground">{salutationSignoffLanguage}</strong>
              </span>
              <ContactLanguagePicker
                currentLanguage={salutationSignoffLanguage}
                onPick={(lang) => onSalutationSignoffLanguageChange(lang, true)}
                disabled={disabled}
                triggerLabel={
                  salutationSignoffLanguageManuallyOverridden ? "Change" : "Change"
                }
              />
              {salutationSignoffLanguageManuallyOverridden && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => {
                    // Clear the manual override; the next debounced detection
                    // tick will populate the language from franc again.
                    onSalutationSignoffLanguageChange(null, false);
                  }}
                  disabled={disabled}
                >
                  Re-detect
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/5">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-xs">
                  Language unclear — please confirm so we use your text for the
                  matching language. Otherwise our built-in defaults apply.
                </AlertDescription>
              </Alert>
              <ContactLanguagePicker
                currentLanguage={null}
                onPick={(lang) => onSalutationSignoffLanguageChange(lang, true)}
                disabled={disabled}
                triggerLabel="Pick a language"
                openOnRender
              />
            </div>
          )}
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

/**
 * Tiny inline picker used by the salutation/sign-off language indicator.
 *
 * Two states:
 *   - Collapsed (default): renders the trigger as a small "Change" /
 *     "Pick a language" link button. Clicking opens the Select.
 *   - Auto-revealed (`openOnRender`): renders the Select inline
 *     (no toggle) so the user sees their options immediately in the
 *     "Language unclear" state.
 *
 * The current shape uses shadcn's Select directly. We can't use a Radix
 * Select's `defaultOpen` reliably (it requires user interaction to
 * close), so the `openOnRender` variant just renders the Select
 * collapsed with focus management on the trigger — the user clicks
 * once to expand, same as the default state. Matches the review-form's
 * pattern (always-visible inline Select on low-confidence).
 */
function ContactLanguagePicker({
  currentLanguage,
  onPick,
  disabled,
  triggerLabel,
  openOnRender,
}: {
  currentLanguage: string | null;
  onPick: (_language: string) => void;
  disabled?: boolean;
  triggerLabel: string;
  openOnRender?: boolean;
}) {
  // When `openOnRender` is true, render the Select inline (always visible).
  // Otherwise render a link-style trigger that swaps to the Select on click.
  // Keep both code paths in this component so the parent doesn't manage
  // open-state.
  if (openOnRender) {
    return (
      <Select
        value={currentLanguage ?? undefined}
        onValueChange={onPick}
        disabled={disabled}
      >
        <SelectTrigger className="h-8 text-xs w-full max-w-xs">
          <SelectValue placeholder="Pick a language" />
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_RESPONSE_LANGUAGES.map((lang) => (
            <SelectItem key={lang} value={lang}>
              {lang}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select
      value={currentLanguage ?? undefined}
      onValueChange={onPick}
      disabled={disabled}
    >
      <SelectTrigger
        className="h-auto p-0 border-0 bg-transparent text-xs font-normal text-primary underline-offset-2 hover:underline focus:ring-0 focus:ring-offset-0 [&>svg]:hidden w-auto inline-flex"
        aria-label={triggerLabel}
      >
        {triggerLabel}
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_RESPONSE_LANGUAGES.map((lang) => (
          <SelectItem key={lang} value={lang}>
            {lang}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ToneSelector } from "./ToneSelector";
import { ResponseLanguageSelector } from "./ResponseLanguageSelector";
import { KeyPhrasesInput } from "./KeyPhrasesInput";
import { StyleGuidelinesInput } from "./StyleGuidelinesInput";
import { SampleResponsesInput, type SampleResponseItem } from "./SampleResponsesInput";
import { PersonalizationSection } from "./PersonalizationSection";
import { ContactSignoffSection } from "./ContactSignoffSection";
import { ExampleChips } from "./ExampleChips";
import { TestResponsePanel } from "./TestResponsePanel";
import { Loader2, RotateCcw, Check, Cloud, CloudOff } from "lucide-react";
import { toast } from "sonner";
import {
  BRAND_VOICE_LIMITS_V2,
  DEFAULT_BRAND_VOICE_TONE_V2,
  DEFAULT_NEGATIVE_REVIEW_FRAMING,
  type BrandVoiceToneV2,
  type NegativeReviewFraming,
} from "@/lib/constants";

/**
 * V2 brand voice form (iter 6).
 *
 * Composes four sections per spec §3:
 *   1. Voice — Tone (4 V2 presets), Style guidelines, Key phrases
 *   2. Examples — Sample responses (V2 object shape)
 *   3. Personalization — Named-staff + Occasion toggles (spec §6)
 *   4. Contact & sign-off — Salutation, sign-off, email invitation with
 *      framing radio + reply-to email (spec §7)
 *
 * Sends the V2 payload directly to `/api/brand-voice`. The iter-3 legacy
 * bridge (`_legacy-bridge.ts`) was deleted in iter 6 — the route now
 * validates via `brandVoiceSchemaV2`.
 *
 * Spec: docs/MVP_Phase-1/BRAND_VOICE_REDESIGN.md §3–§7.
 */

interface BrandVoiceDataV2 {
  id: string;
  tone: BrandVoiceToneV2;
  keyPhrases: string[];
  styleGuidelines: string[];
  sampleResponses: SampleResponseItem[];
  acknowledgeNamedStaff: boolean;
  acknowledgeOccasions: boolean;
  salutationPattern: string;
  signoffLines: string;
  negativeReviewEmailEnabled: boolean;
  negativeReviewFraming: NegativeReviewFraming;
  negativeReviewFramingCustom: string | null;
  replyToEmail: string | null;
  // Null = follow the review's detected language (default behaviour).
  responseLanguage: string | null;
}

const DEFAULT_BRAND_VOICE: Omit<BrandVoiceDataV2, "id"> = {
  tone: DEFAULT_BRAND_VOICE_TONE_V2,
  keyPhrases: ["Thank you", "We appreciate your feedback"],
  styleGuidelines: ["Be genuine and empathetic"],
  sampleResponses: [],
  acknowledgeNamedStaff: true,
  acknowledgeOccasions: true,
  salutationPattern: "Dear {firstName},",
  signoffLines: "Warmest regards,\nThe Team",
  negativeReviewEmailEnabled: false,
  negativeReviewFraming: DEFAULT_NEGATIVE_REVIEW_FRAMING,
  negativeReviewFramingCustom: null,
  replyToEmail: null,
  responseLanguage: null,
};

// Starter chips — spec §4.2 / §4.3.
const STYLE_GUIDELINE_STARTERS: readonly string[] = [
  "Avoid corporate language, write the way you'd speak to a returning guest",
  "For negative reviews, take ownership before explaining",
  "Keep 5-star responses concise; allow more length for complaints",
  'Use "our" rather than "the" when referring to staff',
  "Mirror specific details from the review when natural",
];

const KEY_PHRASE_STARTERS: readonly string[] = [
  "Thank you for taking the time to share your experience",
  "We're delighted to hear",
  "We'd love to welcome you back",
  "Our team will be thrilled to hear this",
  "We appreciate your kind words",
];

// Auto-save delay in milliseconds
const AUTO_SAVE_DELAY = 1500;

export function BrandVoiceForm() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [brandVoice, setBrandVoice] = useState<BrandVoiceDataV2 | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Form state — V2 shape
  const [tone, setTone] = useState<BrandVoiceToneV2>(DEFAULT_BRAND_VOICE_TONE_V2);
  const [keyPhrases, setKeyPhrases] = useState<string[]>([]);
  const [styleGuidelines, setStyleGuidelines] = useState<string[]>([]);
  const [sampleResponses, setSampleResponses] = useState<SampleResponseItem[]>([]);
  const [acknowledgeNamedStaff, setAcknowledgeNamedStaff] = useState(true);
  const [acknowledgeOccasions, setAcknowledgeOccasions] = useState(true);
  const [salutationPattern, setSalutationPattern] = useState(DEFAULT_BRAND_VOICE.salutationPattern);
  const [signoffLines, setSignoffLines] = useState(DEFAULT_BRAND_VOICE.signoffLines);
  const [negativeReviewEmailEnabled, setNegativeReviewEmailEnabled] = useState(false);
  const [negativeReviewFraming, setNegativeReviewFraming] = useState<NegativeReviewFraming>(
    DEFAULT_NEGATIVE_REVIEW_FRAMING,
  );
  const [negativeReviewFramingCustom, setNegativeReviewFramingCustom] = useState<string | null>(null);
  const [replyToEmail, setReplyToEmail] = useState<string | null>(null);
  const [responseLanguage, setResponseLanguage] = useState<string | null>(null);

  // Ref for debounce timer
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchBrandVoice();
  }, []);

  // Honor a URL hash (e.g. `#negative-review-email`) by scrolling the
  // target sub-block into view once the form has rendered. The browser's
  // built-in hash navigation fires on initial page load before our async
  // data fetch resolves, so the target element doesn't exist yet — by
  // the time `isLoading` flips to false the browser has already given
  // up. This effect re-runs the scroll itself.
  useEffect(() => {
    if (isLoading) return;
    if (typeof window === "undefined" || !window.location.hash) return;
    const id = window.location.hash.slice(1);
    if (!id) return;
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [isLoading]);

  const performSave = useCallback(async () => {
    if (!brandVoice) return;

    setIsSaving(true);
    setSaveStatus("saving");

    try {
      const res = await fetch("/api/brand-voice", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tone,
          keyPhrases,
          styleGuidelines,
          sampleResponses,
          acknowledgeNamedStaff,
          acknowledgeOccasions,
          salutationPattern,
          signoffLines,
          negativeReviewEmailEnabled,
          negativeReviewFraming,
          // Empty-string custom framing is normalised to null so the server
          // never has to interpret "" as "this field is set to nothing".
          negativeReviewFramingCustom:
            negativeReviewFramingCustom && negativeReviewFramingCustom.trim().length > 0
              ? negativeReviewFramingCustom
              : null,
          // Same normalisation for the reply-to email so the optional/null
          // distinction is consistent at the boundary.
          replyToEmail:
            replyToEmail && replyToEmail.trim().length > 0 ? replyToEmail : null,
          // Empty-string sentinel from the Select primitive is normalised
          // to null so the server sees "follow detected language" as a
          // clean null, not a zero-length string.
          responseLanguage:
            responseLanguage && responseLanguage.trim().length > 0
              ? responseLanguage
              : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to save brand voice");
      }
      const bv = data.data.brandVoice;
      setBrandVoice(bv);
      setSaveStatus("saved");
    } catch (error) {
      console.error("Error saving brand voice:", error);
      setSaveStatus("unsaved");
      toast.error(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  }, [
    brandVoice,
    tone,
    keyPhrases,
    styleGuidelines,
    sampleResponses,
    acknowledgeNamedStaff,
    acknowledgeOccasions,
    salutationPattern,
    signoffLines,
    negativeReviewEmailEnabled,
    negativeReviewFraming,
    negativeReviewFramingCustom,
    replyToEmail,
    responseLanguage,
  ]);

  // Auto-save effect with debounce
  useEffect(() => {
    if (!isInitialized || !brandVoice) return;

    const hasChanges =
      tone !== brandVoice.tone ||
      JSON.stringify(keyPhrases) !== JSON.stringify(brandVoice.keyPhrases) ||
      JSON.stringify(styleGuidelines) !== JSON.stringify(brandVoice.styleGuidelines) ||
      JSON.stringify(sampleResponses) !== JSON.stringify(brandVoice.sampleResponses) ||
      acknowledgeNamedStaff !== brandVoice.acknowledgeNamedStaff ||
      acknowledgeOccasions !== brandVoice.acknowledgeOccasions ||
      salutationPattern !== brandVoice.salutationPattern ||
      signoffLines !== brandVoice.signoffLines ||
      negativeReviewEmailEnabled !== brandVoice.negativeReviewEmailEnabled ||
      negativeReviewFraming !== brandVoice.negativeReviewFraming ||
      (negativeReviewFramingCustom ?? "") !== (brandVoice.negativeReviewFramingCustom ?? "") ||
      (replyToEmail ?? "") !== (brandVoice.replyToEmail ?? "") ||
      (responseLanguage ?? "") !== (brandVoice.responseLanguage ?? "");

    if (!hasChanges) {
      setSaveStatus("saved");
      return;
    }

    setSaveStatus("unsaved");

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      performSave();
    }, AUTO_SAVE_DELAY);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    isInitialized,
    brandVoice,
    tone,
    keyPhrases,
    styleGuidelines,
    sampleResponses,
    acknowledgeNamedStaff,
    acknowledgeOccasions,
    salutationPattern,
    signoffLines,
    negativeReviewEmailEnabled,
    negativeReviewFraming,
    negativeReviewFramingCustom,
    replyToEmail,
    responseLanguage,
    performSave,
  ]);

  const fetchBrandVoice = async () => {
    try {
      const res = await fetch("/api/brand-voice");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to fetch brand voice");
      }
      const bv = data.data.brandVoice as BrandVoiceDataV2;
      setBrandVoice(bv);
      setTone(bv.tone);
      setKeyPhrases(bv.keyPhrases);
      setStyleGuidelines(bv.styleGuidelines);
      setSampleResponses(bv.sampleResponses);
      setAcknowledgeNamedStaff(bv.acknowledgeNamedStaff);
      setAcknowledgeOccasions(bv.acknowledgeOccasions);
      setSalutationPattern(bv.salutationPattern);
      setSignoffLines(bv.signoffLines);
      setNegativeReviewEmailEnabled(bv.negativeReviewEmailEnabled);
      setNegativeReviewFraming(bv.negativeReviewFraming);
      setNegativeReviewFramingCustom(bv.negativeReviewFramingCustom);
      setReplyToEmail(bv.replyToEmail);
      setResponseLanguage(bv.responseLanguage);
      setTimeout(() => setIsInitialized(true), 100);
    } catch (error) {
      console.error("Error fetching brand voice:", error);
      toast.error("Failed to load brand voice settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setTone(DEFAULT_BRAND_VOICE.tone);
    setKeyPhrases([...DEFAULT_BRAND_VOICE.keyPhrases]);
    setStyleGuidelines([...DEFAULT_BRAND_VOICE.styleGuidelines]);
    setSampleResponses([...DEFAULT_BRAND_VOICE.sampleResponses]);
    setAcknowledgeNamedStaff(DEFAULT_BRAND_VOICE.acknowledgeNamedStaff);
    setAcknowledgeOccasions(DEFAULT_BRAND_VOICE.acknowledgeOccasions);
    setSalutationPattern(DEFAULT_BRAND_VOICE.salutationPattern);
    setSignoffLines(DEFAULT_BRAND_VOICE.signoffLines);
    setNegativeReviewEmailEnabled(DEFAULT_BRAND_VOICE.negativeReviewEmailEnabled);
    setNegativeReviewFraming(DEFAULT_BRAND_VOICE.negativeReviewFraming);
    setNegativeReviewFramingCustom(DEFAULT_BRAND_VOICE.negativeReviewFramingCustom);
    setReplyToEmail(DEFAULT_BRAND_VOICE.replyToEmail);
    setResponseLanguage(DEFAULT_BRAND_VOICE.responseLanguage);
    toast.info("Reset to default values. Changes will auto-save.");
  };

  // Chip pickers — append to the list rather than replace, but cap at the
  // V2 max. Trim and de-duplicate so re-clicking a chip is a no-op.
  const handleStyleGuidelineChipPick = (item: string) => {
    if (styleGuidelines.length >= BRAND_VOICE_LIMITS_V2.STYLE_GUIDELINES_MAX_ITEMS) return;
    if (styleGuidelines.includes(item)) return;
    setStyleGuidelines([...styleGuidelines, item]);
  };

  const handleKeyPhraseChipPick = (item: string) => {
    if (keyPhrases.length >= BRAND_VOICE_LIMITS_V2.KEY_PHRASES_MAX_ITEMS) return;
    if (keyPhrases.includes(item)) return;
    setKeyPhrases([...keyPhrases, item]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header (spec §3). Iter-7 hierarchy pass: demoted from a Card to a
          plain heading block so it visually anchors the page rather than reading
          as "one of the sections". The Card wrappers are reserved for the four
          numbered sections below. */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Brand voice</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Teach our AI how to write responses that sound like you.
          </p>
        </div>
        <SaveStatusIndicator status={saveStatus} />
      </div>

      {/* §1 Voice — Tone, Style guidelines, Key phrases.
          Inner-contrast pass — three sub-blocks (tone / style guidelines /
          key phrases) each in their own tinted-bordered container, matching
          the section-4 pattern. Tone is conceptually about "register",
          style guidelines is "what to write", key phrases is "vocabulary"
          — three concerns, three blocks. Combining the latter two would be
          a single big undifferentiated block. */}
      <Card className="bg-card border-slate-300 shadow-sm">
        <CardHeader>
          <SectionHeader number={1} title="Voice" descriptor="how we sound" />
        </CardHeader>
        <CardContent className="space-y-6">
          {/* §4.1 Tone */}
          <div className="rounded-lg border border-slate-300 bg-slate-50/50 p-4 space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tone
              </p>
              <p className="text-xs text-muted-foreground">
                How responses should sound to your customers.
              </p>
            </div>
            <ToneSelector value={tone} onChange={setTone} disabled={isSaving} />
          </div>

          {/* Response language override.
              Default null = match the review's detected language (existing
              behaviour). Pin to a fixed language for businesses whose
              reviewing audience writes in mixed languages but whose own team
              only reads one (e.g. UK business serving tourists who leave
              French / German / Italian reviews). */}
          <div className="rounded-lg border border-slate-300 bg-slate-50/50 p-4 space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Response language
              </p>
              <p className="text-xs text-muted-foreground">
                What language we write responses in.
              </p>
            </div>
            <ResponseLanguageSelector
              value={responseLanguage}
              onChange={setResponseLanguage}
              disabled={isSaving}
            />
          </div>

          {/* §4.2 Style guidelines */}
          <div className="rounded-lg border border-slate-300 bg-slate-50/50 p-4 space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Style guidelines
              </p>
              <p className="text-xs text-muted-foreground">
                Specific rules our AI should follow when writing responses.
              </p>
            </div>
            <StyleGuidelinesInput
              value={styleGuidelines}
              onChange={setStyleGuidelines}
              disabled={isSaving}
              maxGuidelines={BRAND_VOICE_LIMITS_V2.STYLE_GUIDELINES_MAX_ITEMS}
              maxLength={BRAND_VOICE_LIMITS_V2.STYLE_GUIDELINE_ITEM_MAX}
            />
            <ExampleChips
              label="Starter ideas (click to add)"
              items={STYLE_GUIDELINE_STARTERS}
              onPick={handleStyleGuidelineChipPick}
              disabled={isSaving}
              mode="append"
            />
          </div>

          {/* §4.3 Key phrases */}
          <div className="rounded-lg border border-slate-300 bg-slate-50/50 p-4 space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Key phrases
              </p>
              <p className="text-xs text-muted-foreground">
                Vocabulary and expressions we like to use.
              </p>
            </div>
            <KeyPhrasesInput value={keyPhrases} onChange={setKeyPhrases} disabled={isSaving} />
            <ExampleChips
              label="Starter ideas (click to add)"
              items={KEY_PHRASE_STARTERS}
              onPick={handleKeyPhraseChipPick}
              disabled={isSaving}
              mode="append"
            />
          </div>
        </CardContent>
      </Card>

      {/* §2 Examples — Sample responses.
          Single sub-block (no nesting needed since there's only one control)
          but wrapped in the same tinted-bordered container so the page
          rhythm reads consistently with sections 1 + 4. */}
      <Card className="bg-card border-slate-300 shadow-sm">
        <CardHeader>
          <SectionHeader number={2} title="Examples" descriptor="what good looks like for us" />
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-slate-300 bg-slate-50/50 p-4 space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Sample responses
              </p>
              <p className="text-xs text-muted-foreground">
                Up to 5 of your actual responses. Our AI uses these as reference to match your voice.
              </p>
            </div>
            <SampleResponsesInput
              value={sampleResponses}
              onChange={setSampleResponses}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>

      {/* §3 Personalization — Named-staff + Occasion toggles */}
      <Card className="bg-card border-slate-300 shadow-sm">
        <CardHeader>
          <SectionHeader number={3} title="Personalization" descriptor="what we acknowledge" />
        </CardHeader>
        <CardContent>
          <PersonalizationSection
            acknowledgeNamedStaff={acknowledgeNamedStaff}
            acknowledgeOccasions={acknowledgeOccasions}
            onAcknowledgeNamedStaffChange={setAcknowledgeNamedStaff}
            onAcknowledgeOccasionsChange={setAcknowledgeOccasions}
            disabled={isSaving}
          />
        </CardContent>
      </Card>

      {/* §4 Contact & sign-off — Salutation, sign-off, email invitation */}
      <Card className="bg-card border-slate-300 shadow-sm">
        <CardHeader>
          <SectionHeader number={4} title="Contact & sign-off" descriptor="how we close" />
        </CardHeader>
        <CardContent>
          <ContactSignoffSection
            salutationPattern={salutationPattern}
            signoffLines={signoffLines}
            negativeReviewEmailEnabled={negativeReviewEmailEnabled}
            negativeReviewFraming={negativeReviewFraming}
            negativeReviewFramingCustom={negativeReviewFramingCustom}
            replyToEmail={replyToEmail}
            onSalutationPatternChange={setSalutationPattern}
            onSignoffLinesChange={setSignoffLines}
            onNegativeReviewEmailEnabledChange={setNegativeReviewEmailEnabled}
            onNegativeReviewFramingChange={setNegativeReviewFraming}
            onNegativeReviewFramingCustomChange={setNegativeReviewFramingCustom}
            onReplyToEmailChange={setReplyToEmail}
            disabled={isSaving}
          />
        </CardContent>
      </Card>

      {/* Action row — reset + auto-save reminder */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <Button type="button" variant="outline" onClick={handleReset} disabled={isSaving}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to defaults
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4" />
              <span>Auto-save enabled</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Panel */}
      <TestResponsePanel disabled={isSaving} />
    </div>
  );
}

/**
 * Numbered section header used by all four V2 sections.
 *
 * Renders the title on one line with three visual layers:
 *   - Large muted numeral on the left — gives the reader an at-a-glance
 *     "section 2 of 4" cue without forcing them to read every title.
 *   - Bold title in primary text colour.
 *   - Colon + muted descriptor inline on the same line, replacing the
 *     stacked CardTitle + CardDescription pair so the section header
 *     reads as one rhythm instead of two paragraphs.
 *
 * Inspired by the reference design the user shared during the iter-7
 * hierarchy pass.
 */
function SectionHeader({
  number,
  title,
  descriptor,
}: {
  number: number;
  title: string;
  descriptor: string;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span
        className="text-3xl font-semibold text-muted-foreground/70 tabular-nums leading-none"
        aria-hidden="true"
      >
        {number}
      </span>
      <h2 className="text-lg font-semibold tracking-tight">
        {title}
        <span className="ml-2 text-sm font-normal text-muted-foreground/90">
          : {descriptor}
        </span>
      </h2>
    </div>
  );
}

function SaveStatusIndicator({ status }: { status: "saved" | "saving" | "unsaved" }) {
  if (status === "saving") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Saving...</span>
      </div>
    );
  }
  if (status === "saved") {
    return (
      <div className="flex items-center gap-2 text-sm text-green-500">
        <Cloud className="h-4 w-4" />
        <span>Saved</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-sm text-yellow-500">
      <CloudOff className="h-4 w-4" />
      <span>Unsaved</span>
    </div>
  );
}

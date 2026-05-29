"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUPPORTED_RESPONSE_LANGUAGES } from "@/lib/constants";

/**
 * Per-brand-voice override that pins the AI's response language to a
 * fixed value regardless of the review's detected language. Null = follow
 * the review's detected language (default behaviour for everyone who
 * doesn't change anything). Non-null = one of the display names in
 * `SUPPORTED_RESPONSE_LANGUAGES`.
 *
 * Use case: a UK business with English-only staff that receives reviews
 * in French / German / etc. Without this, the AI generates responses in
 * the review's language, which the business can't read or use.
 *
 * Validated server-side by `brandVoiceSchemaV2.responseLanguage`. The
 * empty-string sentinel below is converted to `null` at the form
 * boundary before the PUT, matching the pattern used by `replyToEmail`
 * and `negativeReviewFramingCustom`.
 */

interface ResponseLanguageSelectorProps {
  value: string | null;
  onChange: (_value: string | null) => void;
  disabled?: boolean;
}

// Radix's Select treats `""` as a sentinel for "no selection". We use
// `__default__` for the "match the review's language" option so it round-
// trips cleanly through Select's value prop, and we map it to / from null
// at the component boundary.
const DEFAULT_SENTINEL = "__default__";

export function ResponseLanguageSelector({
  value,
  onChange,
  disabled,
}: ResponseLanguageSelectorProps) {
  const radixValue = value ?? DEFAULT_SENTINEL;

  const handleChange = (next: string) => {
    onChange(next === DEFAULT_SENTINEL ? null : next);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="response-language">Response language</Label>
      <Select value={radixValue} onValueChange={handleChange} disabled={disabled}>
        <SelectTrigger id="response-language" className="w-full md:w-[320px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={DEFAULT_SENTINEL}>
            Match the review&apos;s language (default)
          </SelectItem>
          {SUPPORTED_RESPONSE_LANGUAGES.map((lang) => (
            <SelectItem key={lang} value={lang}>
              {lang}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        By default, responses are written in the same language as the review.
        Choose a fixed language if your team only reads one.
      </p>
    </div>
  );
}

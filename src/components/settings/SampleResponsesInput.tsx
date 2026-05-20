"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { BRAND_VOICE_LIMITS_V2 } from "@/lib/constants";
import { CollapsibleTextItem } from "./CollapsibleTextItem";

/**
 * V2 sample responses input (iter 6).
 *
 * Each sample is an object: `{ratingContext: 1-5 | 'any', responseText: string}`.
 * The rating context tells the AI which star rating this sample is a good
 * reference for; "any" means it applies regardless of rating.
 *
 * Spec §5.1; replaces the iter-3 legacy `string[]` shape.
 */
export type SampleResponseItem = {
  ratingContext: 1 | 2 | 3 | 4 | 5 | "any";
  responseText: string;
};

interface SampleResponsesInputProps {
  value: SampleResponseItem[];
  onChange: (_responses: SampleResponseItem[]) => void;
  disabled?: boolean;
}

const RATING_OPTIONS: ReadonlyArray<{ value: SampleResponseItem["ratingContext"]; label: string }> = [
  { value: "any", label: "Any review" },
  { value: 5, label: "5-star review" },
  { value: 4, label: "4-star review" },
  { value: 3, label: "3-star review" },
  { value: 2, label: "2-star review" },
  { value: 1, label: "1-star review" },
];

function ratingValueToString(rc: SampleResponseItem["ratingContext"]): string {
  return rc === "any" ? "any" : String(rc);
}

function stringToRatingValue(raw: string): SampleResponseItem["ratingContext"] {
  if (raw === "any") return "any";
  const n = Number(raw);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
  return "any";
}

export function SampleResponsesInput({ value, onChange, disabled }: SampleResponsesInputProps) {
  const [newText, setNewText] = useState("");
  const [newRatingContext, setNewRatingContext] = useState<SampleResponseItem["ratingContext"]>("any");

  const canAddMore = value.length < BRAND_VOICE_LIMITS_V2.SAMPLE_RESPONSES_MAX_ITEMS;

  const addResponse = () => {
    const trimmed = newText.trim();
    if (
      trimmed &&
      trimmed.length <= BRAND_VOICE_LIMITS_V2.SAMPLE_RESPONSE_MAX &&
      canAddMore
    ) {
      onChange([...value, { ratingContext: newRatingContext, responseText: trimmed }]);
      setNewText("");
      setNewRatingContext("any");
    }
  };

  const removeResponse = (index: number) => {
    const next = [...value];
    next.splice(index, 1);
    onChange(next);
  };

  const updateResponseText = (index: number, text: string) => {
    const next = [...value];
    next[index] = { ...next[index], responseText: text };
    onChange(next);
  };

  const updateRatingContext = (index: number, raw: string) => {
    const next = [...value];
    next[index] = { ...next[index], ratingContext: stringToRatingValue(raw) };
    onChange(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      addResponse();
    }
  };

  const calculateRows = (text: string): number => {
    const lineCount = text.split("\n").length;
    return Math.max(3, Math.min(10, lineCount));
  };

  return (
    <div className="space-y-4">
      {/* Existing responses */}
      {value.length > 0 && (
        <div className="space-y-3">
          {value.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center gap-2">
                <label
                  htmlFor={`sample-rating-${index}`}
                  className="text-xs font-medium text-muted-foreground"
                >
                  Best for:
                </label>
                <Select
                  value={ratingValueToString(item.ratingContext)}
                  onValueChange={(v) => updateRatingContext(index, v)}
                  disabled={disabled}
                >
                  <SelectTrigger id={`sample-rating-${index}`} className="h-7 w-[180px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RATING_OPTIONS.map((opt) => (
                      <SelectItem key={ratingValueToString(opt.value)} value={ratingValueToString(opt.value)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <CollapsibleTextItem
                value={item.responseText}
                onChange={(text) => updateResponseText(index, text)}
                onRemove={() => removeResponse(index)}
                disabled={disabled}
                maxLength={BRAND_VOICE_LIMITS_V2.SAMPLE_RESPONSE_MAX}
                index={index}
                totalCount={value.length}
                placeholder="Enter a sample response..."
                maxCollapsedLines={3}
                itemLabel="sample"
              />
            </div>
          ))}
        </div>
      )}

      {/* Add new response - distinct card with dashed border */}
      {canAddMore && (
        <Card className="p-4 border-dashed border-2 border-muted-foreground/30 bg-muted/20">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Plus className="h-4 w-4" />
              <span>Add New Sample Response</span>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="new-sample-rating" className="text-xs font-medium text-muted-foreground">
                Best for:
              </label>
              <Select
                value={ratingValueToString(newRatingContext)}
                onValueChange={(v) => setNewRatingContext(stringToRatingValue(v))}
                disabled={disabled}
              >
                <SelectTrigger id="new-sample-rating" className="h-7 w-[180px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RATING_OPTIONS.map((opt) => (
                    <SelectItem key={ratingValueToString(opt.value)} value={ratingValueToString(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder="Add a sample response that represents your ideal tone and style..."
              maxLength={BRAND_VOICE_LIMITS_V2.SAMPLE_RESPONSE_MAX}
              rows={calculateRows(newText)}
              className="resize-none bg-background"
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                {newText.length} / {BRAND_VOICE_LIMITS_V2.SAMPLE_RESPONSE_MAX} • Ctrl+Enter to add
              </span>
              <Button
                type="button"
                onClick={addResponse}
                disabled={disabled || !newText.trim()}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Sample
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Counter */}
      <p className="text-xs text-muted-foreground">
        {value.length} / {BRAND_VOICE_LIMITS_V2.SAMPLE_RESPONSES_MAX_ITEMS} sample responses
        {!canAddMore && " (maximum reached)"}
      </p>
    </div>
  );
}

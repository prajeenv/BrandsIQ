"use client";

import { cn } from "@/lib/utils";
import {
  BRAND_VOICE_TONES_V2,
  BRAND_VOICE_TONE_INFO_V2,
  type BrandVoiceToneV2,
} from "@/lib/constants";
import { Briefcase, Smile, Coffee, Heart } from "lucide-react";

/**
 * V2 tone selector (iter 6).
 *
 * Renders four cards for the V2 tone keys — Warm & casual, Friendly &
 * professional, Polished & formal, Empathetic & attentive — with display
 * labels and one-line descriptors from `BRAND_VOICE_TONE_INFO_V2`. Selected
 * card gets the primary highlight treatment.
 *
 * The legacy 4-tone set (`professional`/`friendly`/`casual`/`empathetic`)
 * was replaced when iter 6 cut the form payload over to `brandVoiceSchemaV2`.
 * The iter-3 legacy bridge that previously mapped V2 → legacy on the way
 * back from the API is gone.
 */
interface ToneSelectorProps {
  value: BrandVoiceToneV2;
  onChange: (_tone: BrandVoiceToneV2) => void;
  disabled?: boolean;
}

const iconMap = {
  briefcase: Briefcase,
  smile: Smile,
  coffee: Coffee,
  heart: Heart,
};

export function ToneSelector({ value, onChange, disabled }: ToneSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {BRAND_VOICE_TONES_V2.map((tone) => {
        const info = BRAND_VOICE_TONE_INFO_V2[tone];
        const Icon = iconMap[info.icon as keyof typeof iconMap];
        const isSelected = value === tone;

        return (
          <button
            key={tone}
            type="button"
            onClick={() => onChange(tone)}
            disabled={disabled}
            aria-pressed={isSelected}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all text-left",
              "hover:border-primary/50 hover:bg-accent/50",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              isSelected
                ? "border-primary bg-primary/10"
                : "border-slate-300 bg-background",
              disabled && "opacity-50 cursor-not-allowed",
            )}
          >
            <Icon
              className={cn(
                "h-6 w-6",
                isSelected ? "text-primary" : "text-muted-foreground",
              )}
            />
            <div className="text-center">
              <p
                className={cn(
                  "font-medium text-sm",
                  isSelected ? "text-primary" : "text-foreground",
                )}
              >
                {info.label}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {info.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

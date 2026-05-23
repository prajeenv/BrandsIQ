"use client";

import { useState, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { BRAND_VOICE_LIMITS_V2 } from "@/lib/constants";

interface KeyPhrasesInputProps {
  value: string[];
  onChange: (_phrases: string[]) => void;
  disabled?: boolean;
}

export function KeyPhrasesInput({ value, onChange, disabled }: KeyPhrasesInputProps) {
  const [inputValue, setInputValue] = useState("");

  const addPhrase = () => {
    const trimmed = inputValue.trim();
    if (
      trimmed &&
      trimmed.length <= BRAND_VOICE_LIMITS_V2.KEY_PHRASE_MAX &&
      value.length < BRAND_VOICE_LIMITS_V2.KEY_PHRASES_MAX_ITEMS &&
      !value.includes(trimmed)
    ) {
      onChange([...value, trimmed]);
      setInputValue("");
    }
  };

  const removePhrase = (index: number) => {
    const newPhrases = [...value];
    newPhrases.splice(index, 1);
    onChange(newPhrases);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addPhrase();
    }
  };

  const canAddMore = value.length < BRAND_VOICE_LIMITS_V2.KEY_PHRASES_MAX_ITEMS;

  return (
    <div className="space-y-3">
      {/* Input field */}
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a phrase and press Enter..."
          disabled={disabled || !canAddMore}
          maxLength={BRAND_VOICE_LIMITS_V2.KEY_PHRASE_MAX}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={addPhrase}
          disabled={disabled || !canAddMore || !inputValue.trim()}
          className="border-slate-300"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Phrase tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((phrase, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              <span className="max-w-[200px] truncate">{phrase}</span>
              <button
                type="button"
                onClick={() => removePhrase(index)}
                disabled={disabled}
                className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Counter */}
      <p className="text-xs text-muted-foreground">
        {value.length} / {BRAND_VOICE_LIMITS_V2.KEY_PHRASES_MAX_ITEMS} phrases
        {!canAddMore && " (maximum reached)"}
      </p>
    </div>
  );
}

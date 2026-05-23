"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { CollapsibleTextItem } from "./CollapsibleTextItem";

interface StyleGuidelinesInputProps {
  value: string[];
  onChange: (_guidelines: string[]) => void;
  disabled?: boolean;
  maxGuidelines?: number;
  maxLength?: number;
}

export function StyleGuidelinesInput({
  value,
  onChange,
  disabled,
  maxGuidelines = 5,
  maxLength = 200,
}: StyleGuidelinesInputProps) {
  const [inputValue, setInputValue] = useState("");

  const addGuideline = () => {
    const trimmed = inputValue.trim();
    if (trimmed && value.length < maxGuidelines && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInputValue("");
    }
  };

  const removeGuideline = (index: number) => {
    const newGuidelines = [...value];
    newGuidelines.splice(index, 1);
    onChange(newGuidelines);
  };

  const updateGuideline = (index: number, newValue: string) => {
    const newGuidelines = [...value];
    newGuidelines[index] = newValue;
    onChange(newGuidelines);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow Ctrl+Enter or Cmd+Enter to add
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      addGuideline();
    }
  };

  const canAddMore = value.length < maxGuidelines;

  // Calculate dynamic rows: min 3, max 10
  const calculateRows = (text: string): number => {
    const lineCount = text.split("\n").length;
    return Math.max(3, Math.min(10, lineCount));
  };

  return (
    <div className="space-y-3">
      {/* Existing guidelines list */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((guideline, index) => (
            <CollapsibleTextItem
              key={index}
              value={guideline}
              onChange={(newValue) => updateGuideline(index, newValue)}
              onRemove={() => removeGuideline(index)}
              disabled={disabled}
              maxLength={maxLength}
              index={index}
              totalCount={value.length}
              placeholder="Enter a style guideline..."
              maxCollapsedLines={3}
              itemLabel="guideline"
            />
          ))}
        </div>
      )}

      {/* Add new guideline - distinct card with dashed border */}
      {canAddMore && (
        <Card className="p-4 border-dashed border-2 border-slate-300 bg-white">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Plus className="h-4 w-4" />
              <span>Add New Guideline</span>
            </div>
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter a style guideline... (supports multiple lines)"
              disabled={disabled}
              maxLength={maxLength}
              rows={calculateRows(inputValue)}
              className="resize-none bg-background"
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                {inputValue.length} / {maxLength} • Ctrl+Enter to add
              </span>
              <Button
                type="button"
                onClick={addGuideline}
                disabled={disabled || !inputValue.trim()}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Guideline
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Counter and hint */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {value.length === 0
            ? "Examples: \"Always thank customers\", \"Mention our warranty\""
            : `${value.length} / ${maxGuidelines} guidelines`}
        </span>
        {!canAddMore && <span className="text-yellow-600">Maximum reached</span>}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VALIDATION_LIMITS } from "@/lib/constants";

interface ResponseEditorProps {
  initialText: string;
  onSave: (_text: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  textDirection?: "ltr" | "rtl";
}

export function ResponseEditor({
  initialText,
  onSave,
  onCancel,
  isLoading = false,
  textDirection = "ltr",
}: ResponseEditorProps) {
  const [text, setText] = useState(initialText);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setHasChanges(text !== initialText);
  }, [text, initialText]);

  const handleSave = async () => {
    if (!text.trim() || text.length > VALIDATION_LIMITS.RESPONSE_TEXT_MAX) {
      return;
    }
    await onSave(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  const charCount = text.length;
  const isOverLimit = charCount > VALIDATION_LIMITS.RESPONSE_TEXT_MAX;
  const isEmpty = !text.trim();

  return (
    <div className="space-y-3">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Edit your response..."
        rows={6}
        dir={textDirection}
        disabled={isLoading}
        className={`resize-none ${isOverLimit ? "border-destructive" : ""}`}
      />

      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          <span className={isOverLimit ? "text-destructive font-medium" : ""}>
            {charCount}
          </span>
          {" / "}
          {VALIDATION_LIMITS.RESPONSE_TEXT_MAX} characters
          {isOverLimit && (
            <span className="text-destructive ml-2">
              ({charCount - VALIDATION_LIMITS.RESPONSE_TEXT_MAX} over limit)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Ctrl+Enter to save, Escape to cancel
          </span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isLoading || isOverLimit || isEmpty || !hasChanges}
        >
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

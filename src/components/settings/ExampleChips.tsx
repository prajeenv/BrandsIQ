"use client";

import { cn } from "@/lib/utils";

/**
 * Clickable example chips for brand voice fields.
 *
 * Used in the V2 brand voice form (iter 6) for the salutation chips
 * (§7.1), sign-off chips (§7.2), and the various "starter chips" lists
 * the spec defines (§4.2 style guidelines, §4.3 key phrases — those use
 * their own dedicated input components, this is the simpler one-click
 * primitive).
 *
 * Pressing a chip calls `onPick(item)` with the literal string. Callers
 * decide whether that REPLACES the current field value (typical for
 * salutation / sign-off) or APPENDS to a list (typical for key phrases
 * / style guidelines).
 */
interface ExampleChipsProps {
  /** Short label above the chip list, e.g. "Suggestions". */
  label?: string;
  /** Chip strings. Rendered verbatim; newlines are shown as " / " in the chip but passed as-is to onPick. */
  items: readonly string[];
  /** Click handler — receives the literal item string. */
  onPick: (_item: string) => void;
  /** Disable all chips at once. */
  disabled?: boolean;
  /**
   * Render multi-line chips with a small newline glyph in the chip body
   * so users can see line breaks at a glance. Defaults to false (single-
   * line chips collapse to one row with " / " replacing newlines).
   */
  previewLines?: boolean;
}

export function ExampleChips({ label, items, onPick, disabled, previewLines = false }: ExampleChipsProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-1">
      {label && <p className="text-xs text-muted-foreground">{label}</p>}
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => {
          const display = previewLines ? item.replace(/\n/g, " ↵ ") : item.replace(/\n/g, " / ");
          return (
            <button
              key={item}
              type="button"
              onClick={() => onPick(item)}
              disabled={disabled}
              className={cn(
                "inline-flex items-center rounded-full border border-input bg-background px-3 py-1 text-xs font-normal text-foreground transition-colors",
                "hover:bg-accent hover:text-accent-foreground hover:border-accent-foreground/20",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                disabled && "opacity-50 cursor-not-allowed",
              )}
            >
              {display}
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, History, Clock, Sparkles } from "lucide-react";

interface Version {
  id: string;
  responseText: string;
  toneUsed: string;
  creditsUsed: number;
  isEdited: boolean;
  createdAt: string;
  originalCreatedAt: string;
}

interface ResponseVersionHistoryProps {
  versions: Version[];
  textDirection?: "ltr" | "rtl";
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  // Within 2 days, show relative time
  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 172800) return `${Math.floor(diffInSeconds / 86400)}d ago`; // 2 days = 172800 seconds

  // Beyond 2 days, show formatted date (e.g., "Jan 16, 2026")
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const MAX_LINES = 3;

// Helper to check if text needs "show more" (more than MAX_LINES lines or > 150 chars)
function needsExpansion(text: string): boolean {
  const lineCount = (text.match(/\n/g) || []).length + 1;
  return lineCount > MAX_LINES || text.length > 150;
}

// Truncate text to MAX_LINES lines while preserving line breaks, max 150 chars
function truncateText(text: string): string {
  const lines = text.split('\n');
  let result: string;

  if (lines.length <= MAX_LINES) {
    result = text;
  } else {
    // Take first MAX_LINES lines
    result = lines.slice(0, MAX_LINES).join('\n');
  }

  // Always enforce 150 char limit
  if (result.length > 150) {
    return result.substring(0, 150) + '...';
  }

  // Add ellipsis if we truncated by lines
  if (lines.length > MAX_LINES) {
    return result + '...';
  }

  return result;
}

export function ResponseVersionHistory({
  versions,
  textDirection = "ltr",
}: ResponseVersionHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);

  if (versions.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between p-2 h-auto"
        >
          <span className="flex items-center gap-2 text-sm">
            <History className="h-4 w-4" />
            Version History ({versions.length})
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              isOpen ? "transform rotate-180" : ""
            }`}
          />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2 space-y-2">
        {versions.map((version) => {
          const isExpanded = expandedVersionId === version.id;

          return (
            <div
              key={version.id}
              className="border rounded-lg p-3 bg-muted/30 space-y-2"
            >
              {/* Header */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {version.isEdited ? (
                    /* Edited version: only show Edited badge */
                    <Badge variant="outline" className="text-xs">Edited</Badge>
                  ) : (
                    /* Generated version: show Generated badge, tone, and credit */
                    <>
                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        <Sparkles className="mr-1 h-3 w-3" />
                        Generated
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {version.toneUsed}
                      </Badge>
                      {version.creditsUsed > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {version.creditsUsed} credit{version.creditsUsed !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </>
                  )}
                </div>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTimeAgo(version.originalCreatedAt)}
                </span>
              </div>

              {/* Content */}
              <div
                className="text-sm text-muted-foreground whitespace-pre-wrap"
                dir={textDirection}
              >
                {isExpanded ? version.responseText : truncateText(version.responseText)}
              </div>

              {/* Actions */}
              {needsExpansion(version.responseText) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() =>
                    setExpandedVersionId(isExpanded ? null : version.id)
                  }
                >
                  {isExpanded ? "Show less" : "Show more"}
                </Button>
              )}
            </div>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}

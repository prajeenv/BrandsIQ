"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  Edit,
  Copy,
  CheckCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  Coins,
} from "lucide-react";
import { ResponseEditor } from "./ResponseEditor";
import { ToneModifier } from "./ToneModifier";
import { ResponseVersionHistory } from "./ResponseVersionHistory";
import { CREDIT_COSTS } from "@/lib/constants";
import { useCredits } from "@/components/providers/CreditsProvider";
import { OutOfCreditsDialog } from "@/components/dashboard";

interface ResponseVersion {
  id: string;
  responseText: string;
  toneUsed: string;
  creditsUsed: number;
  isEdited: boolean;
  createdAt: string;
  originalCreatedAt: string;
}

interface Response {
  id: string;
  responseText: string;
  isEdited: boolean;
  editedAt: string | null;
  creditsUsed: number;
  toneUsed: string;
  generationModel: string;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  totalCreditsUsed: number;
  versions: ResponseVersion[];
}

interface ResponsePanelProps {
  reviewId: string;
  response: Response | null;
  textDirection?: "ltr" | "rtl";
  onResponseUpdate?: () => void;
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

const MAX_LINES = 10;

// Helper to check if text needs "show more" (more than MAX_LINES lines)
function needsExpansion(text: string): boolean {
  const lineCount = (text.match(/\n/g) || []).length + 1;
  return lineCount > MAX_LINES;
}

// Truncate text to MAX_LINES lines while preserving line breaks
function truncateToLines(text: string, maxLines: number): string {
  const lines = text.split('\n');
  if (lines.length <= maxLines) {
    return text;
  }
  return lines.slice(0, maxLines).join('\n') + '...';
}

export function ResponsePanel({
  reviewId,
  response,
  textDirection = "ltr",
  onResponseUpdate,
}: ResponsePanelProps) {
  const { credits, creditsTotal, creditsResetDate, refreshCredits } = useCredits();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localResponse, setLocalResponse] = useState<Response | null>(response);
  const [isResponseExpanded, setIsResponseExpanded] = useState(false);
  const [showOutOfCreditsDialog, setShowOutOfCreditsDialog] = useState(false);
  const [outOfCreditsActionType, setOutOfCreditsActionType] = useState<"generate" | "regenerate">("generate");

  // Update local response when prop changes
  if (response?.responseText !== localResponse?.responseText && !isEditing) {
    setLocalResponse(response);
  }

  const handleCopy = async () => {
    if (!localResponse) return;
    try {
      await navigator.clipboard.writeText(localResponse.responseText);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleSaveEdit = async (text: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/response`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responseText: text }),
      });

      const result = await res.json();

      if (result.success) {
        setLocalResponse((prev) =>
          prev
            ? {
                ...prev,
                responseText: result.data.response.responseText,
                isEdited: result.data.response.isEdited,
                editedAt: result.data.response.editedAt,
              }
            : null
        );
        setIsEditing(false);
        toast.success("Response updated!");
        onResponseUpdate?.();
      } else {
        toast.error(result.error?.message || "Failed to update response");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async (tone: "professional" | "friendly" | "empathetic") => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tone }),
      });

      const result = await res.json();

      if (result.success) {
        // Update local state with new response (versions will be fetched via onResponseUpdate)
        setLocalResponse((prev) =>
          prev
            ? {
                ...prev,
                responseText: result.data.response.responseText,
                toneUsed: result.data.response.toneUsed,
                isEdited: false,
                editedAt: null,
              }
            : null
        );
        toast.success(`Response regenerated with ${tone} tone!`);
        refreshCredits();
        onResponseUpdate?.(); // This will fetch fresh data including the new version
      } else {
        if (result.error?.code === "INSUFFICIENT_CREDITS") {
          setOutOfCreditsActionType("regenerate");
          setShowOutOfCreditsDialog(true);
        } else {
          toast.error(result.error?.message || "Failed to regenerate response");
        }
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/publish`, {
        method: "POST",
      });

      const result = await res.json();

      if (result.success) {
        setLocalResponse((prev) =>
          prev
            ? {
                ...prev,
                isPublished: true,
                publishedAt: result.data.response.publishedAt,
              }
            : null
        );
        toast.success("Response marked as approved!");
        onResponseUpdate?.();
      } else {
        toast.error(result.error?.message || "Failed to approve response");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const result = await res.json();

      if (result.success) {
        setLocalResponse({
          id: result.data.response.id,
          responseText: result.data.response.responseText,
          toneUsed: result.data.response.toneUsed,
          creditsUsed: result.data.response.creditsUsed,
          isEdited: false,
          editedAt: null,
          generationModel: result.data.response.generationModel,
          isPublished: false,
          publishedAt: null,
          createdAt: result.data.response.createdAt,
          updatedAt: result.data.response.createdAt,
          totalCreditsUsed: result.data.response.creditsUsed,
          versions: [],
        });
        toast.success("Response generated successfully!");
        refreshCredits();
        onResponseUpdate?.();
      } else {
        if (result.error?.code === "INSUFFICIENT_CREDITS") {
          setOutOfCreditsActionType("generate");
          setShowOutOfCreditsDialog(true);
        } else if (result.error?.code === "AI_SERVICE_UNAVAILABLE") {
          toast.error("AI service is temporarily unavailable. Please try again.");
        } else {
          toast.error(result.error?.message || "Failed to generate response");
        }
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Empty state - no response
  if (!localResponse) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Sparkles className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">
                No response generated yet.
              </p>
              <Button
                className="mt-4"
                onClick={handleGenerate}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Response
                  </>
                )}
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Uses {CREDIT_COSTS.GENERATE_RESPONSE} credit
              </p>
            </div>
          </CardContent>
        </Card>

        <OutOfCreditsDialog
          open={showOutOfCreditsDialog}
          onOpenChange={setShowOutOfCreditsDialog}
          creditsRemaining={credits}
          creditsTotal={creditsTotal}
          resetDate={creditsResetDate ?? undefined}
          actionType={outOfCreditsActionType}
        />
      </>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Response
          </CardTitle>
          {localResponse.totalCreditsUsed > 0 && (
            <Badge variant="secondary" className="text-xs">
              <Coins className="mr-1 h-3 w-3" />
              {localResponse.totalCreditsUsed} credit{localResponse.totalCreditsUsed !== 1 ? "s" : ""} used
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status badges and metadata */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {localResponse.isPublished && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <CheckCircle className="mr-1 h-3 w-3" />
                Approved
              </Badge>
            )}
            {localResponse.isEdited ? (
              /* Edited response: only show Edited badge (no tone, no credit, no Generated) */
              <Badge variant="outline">Edited</Badge>
            ) : (
              /* Generated response: show Generated badge, tone, and credit */
              <>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  <Sparkles className="mr-1 h-3 w-3" />
                  Generated
                </Badge>
                <Badge variant="outline">{localResponse.toneUsed} tone</Badge>
                {localResponse.creditsUsed > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {localResponse.creditsUsed} credit{localResponse.creditsUsed !== 1 ? "s" : ""}
                  </Badge>
                )}
              </>
            )}
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTimeAgo(localResponse.updatedAt)}
          </span>
        </div>

        {/* Response content or editor */}
        {isEditing ? (
          <ResponseEditor
            initialText={localResponse.responseText}
            onSave={handleSaveEdit}
            onCancel={() => setIsEditing(false)}
            isLoading={isLoading}
            textDirection={textDirection}
          />
        ) : (
          <>
            {/* Response text */}
            <div className="bg-muted/50 rounded-lg p-4">
              <p
                className="text-sm leading-relaxed whitespace-pre-wrap"
                dir={textDirection}
              >
                {isResponseExpanded ? localResponse.responseText : truncateToLines(localResponse.responseText, MAX_LINES)}
              </p>
              {needsExpansion(localResponse.responseText) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground mt-2"
                  onClick={() => setIsResponseExpanded(!isResponseExpanded)}
                >
                  {isResponseExpanded ? (
                    <>
                      <ChevronUp className="mr-1 h-3 w-3" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-1 h-3 w-3" />
                      Show more
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={isLoading}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                disabled={isLoading}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <ToneModifier
                onRegenerate={handleRegenerate}
                isLoading={isLoading}
                currentTone={localResponse.toneUsed}
                creditsNeeded={CREDIT_COSTS.REGENERATE_RESPONSE}
              />
              {!localResponse.isPublished && (
                <Button
                  size="sm"
                  onClick={handlePublish}
                  disabled={isLoading}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </Button>
              )}
            </div>
          </>
        )}

        {/* Version history */}
        {localResponse.versions.length > 0 && (
          <>
            <Separator />
            <ResponseVersionHistory
              versions={localResponse.versions}
              textDirection={textDirection}
            />
          </>
        )}
      </CardContent>

      <OutOfCreditsDialog
        open={showOutOfCreditsDialog}
        onOpenChange={setShowOutOfCreditsDialog}
        creditsRemaining={credits}
        creditsTotal={creditsTotal}
        resetDate={creditsResetDate ?? undefined}
        actionType={outOfCreditsActionType}
      />
    </Card>
  );
}

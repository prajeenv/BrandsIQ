"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Star,
  Globe,
  Clock,
  Edit,
  Trash2,
  ExternalLink,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getTextDirection } from "@/lib/language-detection";
import { ResponsePanel } from "@/components/reviews/ResponsePanel";
import { useCredits } from "@/components/providers/CreditsProvider";
import { OutOfCreditsDialog } from "@/components/dashboard";
import { CREDIT_COSTS } from "@/lib/constants";
import { getNextResetDate } from "@/lib/utils";

interface ReviewDetail {
  id: string;
  platform: string;
  reviewText: string;
  rating: number | null;
  reviewerName: string | null;
  reviewDate: string | null;
  detectedLanguage: string;
  sentiment: string | null;
  externalId: string | null;
  externalUrl: string | null;
  createdAt: string;
  updatedAt: string;
  response: {
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
    versions: Array<{
      id: string;
      responseText: string;
      toneUsed: string;
      creditsUsed: number;
      isEdited: boolean;
      createdAt: string;
      originalCreatedAt: string;
    }>;
  } | null;
}

function getSentimentColor(sentiment: string | null) {
  switch (sentiment) {
    case "positive":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "negative":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "neutral":
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  }
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

export default function ReviewDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;

  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReviewExpanded, setIsReviewExpanded] = useState(false);
  const [showOutOfCreditsDialog, setShowOutOfCreditsDialog] = useState(false);
  const [showSentimentAlert, setShowSentimentAlert] = useState(
    searchParams.get("sentimentSkipped") === "true"
  );
  const { credits, creditsTotal, creditsResetDate, sentimentResetDate, refreshCredits } = useCredits();

  useEffect(() => {
    async function fetchReview() {
      try {
        const response = await fetch(`/api/reviews/${id}`);
        const result = await response.json();

        if (result.success) {
          setReview(result.data.review);
        } else {
          toast.error(result.error?.message || "Failed to load review");
          if (result.error?.code === "NOT_FOUND") {
            router.push("/dashboard/reviews");
          }
        }
      } catch {
        toast.error("Failed to load review");
      } finally {
        setIsLoading(false);
      }
    }

    fetchReview();
  }, [id, router]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/reviews/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Review deleted successfully");
        router.push("/dashboard/reviews");
      } else {
        toast.error(result.error?.message || "Failed to delete review");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/reviews/${id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const result = await res.json();

      if (result.success) {
        // Refresh the review data to get the new response
        const reviewRes = await fetch(`/api/reviews/${id}`);
        const reviewResult = await reviewRes.json();
        if (reviewResult.success) {
          setReview(reviewResult.data.review);
        }
        toast.success("Response generated successfully!");
        refreshCredits();
      } else {
        if (result.error?.code === "INSUFFICIENT_CREDITS") {
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
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!review) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Review not found</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/reviews">Back to Reviews</Link>
        </Button>
      </div>
    );
  }

  const textDirection = getTextDirection(review.detectedLanguage);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/reviews">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Reviews
        </Link>
      </Button>

      {/* Sentiment skipped alert */}
      {showSentimentAlert && (() => {
        const nextReset = getNextResetDate(sentimentResetDate);
        const formattedResetDate = nextReset
          ? nextReset.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : null;
        return (
          <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/50 relative">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800 dark:text-yellow-200">
              Sentiment Analysis Skipped
            </AlertTitle>
            <AlertDescription className="text-yellow-700 dark:text-yellow-300">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <span>
                  No sentiment credits remaining.{" "}
                  {formattedResetDate && <span>Resets on {formattedResetDate}.</span>}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    className="border-yellow-600 text-yellow-800 hover:bg-yellow-100 dark:border-yellow-400 dark:text-yellow-200 dark:hover:bg-yellow-950"
                  >
                    <Link href="/pricing">
                      Upgrade Plan
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </AlertDescription>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 absolute top-2 right-2 opacity-70 hover:opacity-100"
              onClick={() => setShowSentimentAlert(false)}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Dismiss</span>
            </Button>
          </Alert>
        );
      })()}

      {/* Review card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{review.platform}</Badge>
              {review.rating && (
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < review.rating!
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
              )}
              {review.sentiment ? (
                <Badge className={getSentimentColor(review.sentiment)}>
                  {review.sentiment}
                </Badge>
              ) : (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <Badge
                          variant="outline"
                          className="text-muted-foreground"
                        >
                          Sentiment
                          <AlertTriangle className="ml-1 h-4 w-4" />
                        </Badge>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Sentiment analysis skipped - no credits</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {review.detectedLanguage !== "English" && (
                <Badge variant="outline">
                  <Globe className="mr-1 h-3 w-3" />
                  {review.detectedLanguage}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!review.response && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                      >
                        {isGenerating ? (
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
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Uses {CREDIT_COSTS.GENERATE_RESPONSE} credit</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/reviews/${review.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Review text */}
          <div>
            <p
              className="text-sm leading-relaxed whitespace-pre-wrap"
              dir={textDirection}
            >
              {isReviewExpanded ? review.reviewText : truncateToLines(review.reviewText, MAX_LINES)}
            </p>
            {needsExpansion(review.reviewText) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground mt-1"
                onClick={() => setIsReviewExpanded(!isReviewExpanded)}
              >
                {isReviewExpanded ? (
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

          {/* Reviewer and metadata inline */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {review.reviewerName && (
              <span>By {review.reviewerName}</span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Added {formatTimeAgo(review.createdAt)}
            </span>
            {review.reviewDate && (
              <span>
                Reviewed {formatTimeAgo(review.reviewDate)}
              </span>
            )}
            {review.externalUrl && (
              <a
                href={review.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
              >
                View original <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Response section - only show when response exists */}
      {review.response && (
        <ResponsePanel
          reviewId={review.id}
          response={review.response}
          textDirection={textDirection}
          onResponseUpdate={() => {
            // Refresh review data
            fetch(`/api/reviews/${id}`)
              .then((res) => res.json())
              .then((result) => {
                if (result.success) {
                  setReview(result.data.review);
                }
              });
          }}
        />
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Review</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this review? This action cannot be
              undone. Any associated response and version history will also be
              deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Out of credits dialog */}
      <OutOfCreditsDialog
        open={showOutOfCreditsDialog}
        onOpenChange={setShowOutOfCreditsDialog}
        creditsRemaining={credits}
        creditsTotal={creditsTotal}
        resetDate={creditsResetDate ?? undefined}
        actionType="generate"
      />
    </div>
  );
}

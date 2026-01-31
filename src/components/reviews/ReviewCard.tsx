"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Star,
  MoreVertical,
  Edit,
  Trash2,
  MessageSquare,
  Clock,
  Globe,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Coins,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export interface ReviewCardData {
  id: string;
  platform: string;
  reviewText: string;
  rating: number | null;
  reviewerName: string | null;
  reviewDate: string | null;
  detectedLanguage: string;
  sentiment: string | null;
  createdAt: string;
  response: {
    id: string;
    responseText: string;
    isEdited: boolean;
    isPublished: boolean;
    createdAt: string;
    updatedAt: string;
    totalCreditsUsed: number;
  } | null;
}

interface ReviewCardProps {
  review: ReviewCardData;
  onDelete?: (_id: string) => void;
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

// Helper to check if text needs "show more" (more than 2 lines or >150 chars)
function needsExpansion(text: string): boolean {
  const lineCount = (text.match(/\n/g) || []).length + 1;
  return lineCount > 2 || text.length > 150;
}

// Truncate text to first 2 lines while preserving line breaks, max 150 chars
function truncateToTwoLines(text: string): string {
  const lines = text.split('\n');
  let result: string;

  if (lines.length <= 2) {
    result = lines.join('\n');
  } else {
    // Take first 2 lines
    result = lines.slice(0, 2).join('\n');
  }

  // Always enforce 150 char limit
  if (result.length > 150) {
    return result.substring(0, 150) + '...';
  }

  // Add ellipsis if we truncated by lines
  if (lines.length > 2) {
    return result + '...';
  }

  return result;
}

export function ReviewCard({ review, onDelete }: ReviewCardProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReviewExpanded, setIsReviewExpanded] = useState(false);
  const [isResponseExpanded, setIsResponseExpanded] = useState(false);

  const textDirection = getTextDirection(review.detectedLanguage);
  const reviewNeedsExpansion = needsExpansion(review.reviewText);
  const responseNeedsExpansion = review.response && needsExpansion(review.response.responseText);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/reviews/${review.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Review deleted successfully");
        setShowDeleteDialog(false);
        onDelete?.(review.id);
        router.refresh();
      } else {
        toast.error(result.error?.message || "Failed to delete review");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Rating/Platform icon */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
              {review.rating ? (
                <div className="flex items-center">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="ml-0.5 text-xs font-medium">
                    {review.rating}
                  </span>
                </div>
              ) : (
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              )}
            </div>

            {/* Review content */}
            <div className="flex-1 min-w-0">
              {/* Badges row */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {review.platform}
                  </Badge>
                  {review.sentiment ? (
                    <Badge
                      className={`text-xs ${getSentimentColor(review.sentiment)}`}
                      variant="secondary"
                    >
                      {review.sentiment}
                    </Badge>
                  ) : (
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex">
                            <Badge
                              variant="outline"
                              className="text-xs text-muted-foreground"
                            >
                              Sentiment
                              <AlertTriangle className="ml-1 h-3 w-3" />
                            </Badge>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Sentiment analysis skipped - no credits</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {review.response && (
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Responded
                    </Badge>
                  )}
                  {review.detectedLanguage !== "English" && (
                    <Badge variant="outline" className="text-xs">
                      <Globe className="mr-1 h-3 w-3" />
                      {review.detectedLanguage}
                    </Badge>
                  )}
                </div>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {review.reviewerName && (
                    <>
                      <span>by {review.reviewerName}</span>
                      <span>·</span>
                    </>
                  )}
                  <Clock className="h-3 w-3" />
                  {review.reviewDate
                    ? `Reviewed ${formatTimeAgo(review.reviewDate)}`
                    : `Added ${formatTimeAgo(review.createdAt)}`}
                </span>
              </div>

              {/* Review text */}
              <div>
                <Link href={`/dashboard/reviews/${review.id}`}>
                  <p
                    className="text-sm whitespace-pre-line hover:text-primary cursor-pointer"
                    dir={textDirection}
                  >
                    {isReviewExpanded ? review.reviewText : truncateToTwoLines(review.reviewText)}
                  </p>
                </Link>
                {reviewNeedsExpansion && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
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

              {/* Response preview */}
              {review.response && (
                <div className="mt-3 p-2 bg-muted/50 rounded-md">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <div className="flex items-center gap-2">
                      <span>AI Response:</span>
                      {review.response.totalCreditsUsed > 0 && (
                        <span className="flex items-center gap-1">
                          <Coins className="h-3 w-3" />
                          {review.response.totalCreditsUsed} credit{review.response.totalCreditsUsed !== 1 ? "s" : ""} used
                        </span>
                      )}
                    </div>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(review.response.updatedAt)}
                    </span>
                  </div>
                  <p
                    className="text-sm whitespace-pre-line"
                    dir={textDirection}
                  >
                    {isResponseExpanded ? review.response.responseText : truncateToTwoLines(review.response.responseText)}
                  </p>
                  {responseNeedsExpansion && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground mt-1"
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
              )}

            </div>

            {/* Actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/reviews/${review.id}`}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    View Details
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/reviews/${review.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Review
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

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
    </>
  );
}

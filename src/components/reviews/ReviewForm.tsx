"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Star, Globe, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createReviewSchema, type CreateReviewInput } from "@/lib/validations";
import { PLATFORMS, VALIDATION_LIMITS } from "@/lib/constants";
import { trackSentimentAnalyzed } from "@/lib/posthog-events";
import { getSupportedLanguages, detectLanguage, isRTLLanguage } from "@/lib/language-detection";

interface ReviewFormProps {
  initialData?: {
    id: string;
    platform: string;
    reviewText: string;
    rating: number | null;
    reviewerName: string | null;
    reviewDate: string | null;
    detectedLanguage: string;
  };
  mode?: "create" | "edit";
}

export function ReviewForm({ initialData, mode = "create" }: ReviewFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<string>("English");
  const [languageConfidence, setLanguageConfidence] = useState<"high" | "low">("low");
  const [isRTL, setIsRTL] = useState(false);
  const [showLanguageOverride, setShowLanguageOverride] = useState(false);
  const [manualLanguage, setManualLanguage] = useState<string | undefined>();

  const supportedLanguages = getSupportedLanguages();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateReviewInput>({
    resolver: zodResolver(createReviewSchema),
    defaultValues: {
      platform: (initialData?.platform as typeof PLATFORMS[number]) || "Google",
      reviewText: initialData?.reviewText || "",
      rating: initialData?.rating ?? undefined,
      reviewerName: initialData?.reviewerName ?? undefined,
      reviewDate: initialData?.reviewDate ?? undefined,
      detectedLanguage: initialData?.detectedLanguage || undefined,
    },
  });

  const reviewText = watch("reviewText");
  const rating = watch("rating");

  // Debounced language detection
  const detectLanguageDebounced = useCallback((text: string) => {
    if (!text || text.length < 10) {
      setDetectedLanguage("English");
      setLanguageConfidence("low");
      setIsRTL(false);
      return;
    }

    const result = detectLanguage(text);
    setDetectedLanguage(result.language);
    setLanguageConfidence(result.confidence);
    setIsRTL(result.isRTL);

    // Auto-show language override if confidence is low
    if (result.confidence === "low" && text.length >= 10) {
      setShowLanguageOverride(true);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      detectLanguageDebounced(reviewText || "");
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [reviewText, detectLanguageDebounced]);

  const onSubmit = async (data: CreateReviewInput) => {
    setIsSubmitting(true);

    try {
      const payload = {
        ...data,
        detectedLanguage: manualLanguage || detectedLanguage,
      };

      const url = mode === "edit" ? `/api/reviews/${initialData?.id}` : "/api/reviews";
      const method = mode === "edit" ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(mode === "edit" ? "Review updated!" : "Review added successfully!");

        // PostHog: sentiment_analyzed. Only fires on create (not edit) when
        // a sentiment was actually produced — skipped sentiment (no credits)
        // is signalled by sentimentWarning + null review.sentiment. The
        // review object on the response carries the resulting sentiment.
        if (
          mode === "create" &&
          !result.data?.sentimentWarning &&
          result.data?.review?.sentiment
        ) {
          trackSentimentAnalyzed({
            sentiment: result.data.review.sentiment as
              | "positive"
              | "neutral"
              | "negative",
          });
        }

        // Pass sentimentSkipped param if sentiment was skipped due to no credits
        const reviewUrl = result.data?.sentimentWarning
          ? `/dashboard/reviews/${result.data.review.id}?sentimentSkipped=true`
          : `/dashboard/reviews/${result.data.review.id}`;
        router.push(reviewUrl);
        router.refresh();
      } else {
        toast.error(result.error?.message || "Failed to save review");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const characterCount = reviewText?.length || 0;
  const characterPercentage = (characterCount / VALIDATION_LIMITS.REVIEW_TEXT_MAX) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "edit" ? "Edit Review" : "Add New Review"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Platform selector */}
          <div className="space-y-2">
            <Label htmlFor="platform">Platform *</Label>
            <Select
              value={watch("platform")}
              onValueChange={(value) => setValue("platform", value as typeof PLATFORMS[number])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((platform) => (
                  <SelectItem key={platform} value={platform}>
                    {platform}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.platform && (
              <p className="text-sm text-destructive">{errors.platform.message}</p>
            )}
          </div>

          {/* Review text */}
          <div className="space-y-2">
            <Label htmlFor="reviewText">Review Text *</Label>
            <Textarea
              id="reviewText"
              placeholder="Paste or type the customer review here..."
              className={`min-h-[150px] ${isRTL ? "text-right" : "text-left"}`}
              dir={isRTL ? "rtl" : "ltr"}
              {...register("reviewText")}
            />
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {detectedLanguage && (
                  <>
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Detected: {detectedLanguage}
                    </span>
                    {languageConfidence === "low" && (
                      <Badge variant="outline" className="text-xs">
                        <AlertCircle className="mr-1 h-3 w-3" />
                        Low confidence
                      </Badge>
                    )}
                    {!showLanguageOverride && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() => setShowLanguageOverride(true)}
                      >
                        Change
                      </Button>
                    )}
                  </>
                )}
              </div>
              <span
                className={`${
                  characterPercentage > 90
                    ? "text-destructive"
                    : characterPercentage > 75
                    ? "text-yellow-600"
                    : "text-muted-foreground"
                }`}
              >
                {characterCount}/{VALIDATION_LIMITS.REVIEW_TEXT_MAX}
              </span>
            </div>
            {errors.reviewText && (
              <p className="text-sm text-destructive">{errors.reviewText.message}</p>
            )}
          </div>

          {/* Language override */}
          {showLanguageOverride && (
            <div className="space-y-2">
              <Label htmlFor="languageOverride">Override Language</Label>
              <Select
                value={manualLanguage || detectedLanguage}
                onValueChange={(value) => {
                  setManualLanguage(value);
                  setIsRTL(isRTLLanguage(value));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supportedLanguages.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Override if auto-detection is incorrect
              </p>
            </div>
          )}

          {/* Rating selector */}
          <div className="space-y-2">
            <Label>Rating (optional)</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() =>
                    setValue("rating", rating === star ? undefined : star)
                  }
                  className="rounded p-1 hover:bg-muted transition-colors"
                >
                  <Star
                    className={`h-6 w-6 ${
                      rating && star <= rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
              {rating && (
                <span className="ml-2 text-sm text-muted-foreground">
                  {rating} star{rating > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          {/* Reviewer name */}
          <div className="space-y-2">
            <Label htmlFor="reviewerName">Reviewer Name (optional)</Label>
            <Input
              id="reviewerName"
              placeholder="e.g., John D."
              {...register("reviewerName")}
            />
          </div>

          {/* Review date */}
          <div className="space-y-2">
            <Label htmlFor="reviewDate">Review Date (optional)</Label>
            <Input
              id="reviewDate"
              type="date"
              max={new Date().toISOString().split("T")[0]}
              {...register("reviewDate")}
            />
          </div>

          {/* Submit button */}
          <div className="flex items-center gap-4 pt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === "edit" ? "Saving..." : "Adding..."}
                </>
              ) : mode === "edit" ? (
                "Save Changes"
              ) : (
                "Add Review"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

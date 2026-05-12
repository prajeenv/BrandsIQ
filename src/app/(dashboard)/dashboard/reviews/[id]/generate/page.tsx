"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Sparkles,
  Star,
  Globe,
  Loader2,
  AlertCircle,
  CheckCircle,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getTextDirection } from "@/lib/language-detection";
import { CREDIT_COSTS } from "@/lib/constants";
import { useCredits } from "@/components/providers/CreditsProvider";
import { OutOfCreditsDialog } from "@/components/dashboard";

interface Review {
  id: string;
  platform: string;
  reviewText: string;
  rating: number | null;
  reviewerName: string | null;
  detectedLanguage: string;
  sentiment: string | null;
}

interface GeneratedResponse {
  id: string;
  responseText: string;
  toneUsed: string;
  creditsUsed: number;
}

type ToneOption = "default" | "professional" | "friendly" | "empathetic";

const toneOptions: Array<{
  value: ToneOption;
  label: string;
  description: string;
}> = [
  {
    value: "default",
    label: "Default",
    description: "Use your configured brand voice settings",
  },
  {
    value: "professional",
    label: "Professional",
    description: "Business-like, courteous, and formal",
  },
  {
    value: "friendly",
    label: "Friendly",
    description: "Warm, personable, and approachable",
  },
  {
    value: "empathetic",
    label: "Empathetic",
    description: "Understanding and compassionate",
  },
];

export default function GenerateResponsePage() {
  const router = useRouter();
  const params = useParams();
  const reviewId = params.id as string;

  const [review, setReview] = useState<Review | null>(null);
  const [isLoadingReview, setIsLoadingReview] = useState(true);
  const [selectedTone, setSelectedTone] = useState<ToneOption>("default");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResponse, setGeneratedResponse] = useState<GeneratedResponse | null>(null);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [showOutOfCreditsDialog, setShowOutOfCreditsDialog] = useState(false);
  const {
    credits,
    creditsTotal,
    creditsResetDate,
    refreshCredits,
    currentPhase,
    isBetaUser,
    organizationName,
  } = useCredits();
  const { data: session } = useSession();
  const [error, setError] = useState<string | null>(null);

  // Fetch review
  useEffect(() => {
    async function fetchReview() {
      try {
        const response = await fetch(`/api/reviews/${reviewId}`);
        const result = await response.json();

        if (result.success) {
          // Check if response already exists
          if (result.data.review.response) {
            toast.info("This review already has a response");
            router.push(`/dashboard/reviews/${reviewId}`);
            return;
          }
          setReview(result.data.review);
        } else {
          setError(result.error?.message || "Failed to load review");
          if (result.error?.code === "NOT_FOUND") {
            router.push("/dashboard/reviews");
          }
        }
      } catch {
        setError("Failed to load review");
      } finally {
        setIsLoadingReview(false);
      }
    }

    fetchReview();
  }, [reviewId, router]);

  const handleGenerate = async () => {
    if (!review) return;

    setIsGenerating(true);
    setError(null);

    try {
      const body: { tone?: string } = {};
      if (selectedTone !== "default") {
        body.tone = selectedTone;
      }

      const response = await fetch(`/api/reviews/${reviewId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.success) {
        setGeneratedResponse(result.data.response);
        setCreditsRemaining(result.data.creditsRemaining);
        toast.success("Response generated successfully!");
        refreshCredits();
      } else {
        if (result.error?.code === "INSUFFICIENT_CREDITS") {
          setShowOutOfCreditsDialog(true);
        } else if (result.error?.code === "AI_SERVICE_UNAVAILABLE") {
          setError("AI service is temporarily unavailable. Please try again in a moment.");
        } else {
          setError(result.error?.message || "Failed to generate response");
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedResponse) return;
    try {
      await navigator.clipboard.writeText(generatedResponse.responseText);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleViewReview = () => {
    router.push(`/dashboard/reviews/${reviewId}`);
  };

  if (isLoadingReview) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-32 w-full" />
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

  // Success state - response generated
  if (generatedResponse) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/reviews/${reviewId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Review
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Response Generated!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{generatedResponse.toneUsed} tone</Badge>
              <Badge variant="secondary">
                {generatedResponse.creditsUsed} credit used
              </Badge>
              {creditsRemaining !== null && (
                <span className="text-sm text-muted-foreground ml-auto">
                  {creditsRemaining} credits remaining
                </span>
              )}
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <p
                className="text-sm leading-relaxed whitespace-pre-wrap"
                dir={textDirection}
              >
                {generatedResponse.responseText}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handleCopy} variant="outline">
                <Copy className="mr-2 h-4 w-4" />
                Copy to Clipboard
              </Button>
              <Button onClick={handleViewReview}>
                View Review Details
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Generate form
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/dashboard/reviews/${reviewId}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Review
        </Link>
      </Button>

      {/* Review preview */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{review.platform}</Badge>
            {review.rating && (
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3 w-3 ${
                      i < review.rating!
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                ))}
              </div>
            )}
            {review.detectedLanguage !== "English" && (
              <Badge variant="outline">
                <Globe className="mr-1 h-3 w-3" />
                {review.detectedLanguage}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p
            className="text-sm leading-relaxed whitespace-pre-wrap"
            dir={textDirection}
          >
            {review.reviewText}
          </p>
          {review.reviewerName && (
            <p className="text-sm text-muted-foreground mt-2">
              - {review.reviewerName}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Generation options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Generate AI Response
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <Label className="text-sm font-medium">Response Tone</Label>
            <RadioGroup
              value={selectedTone}
              onValueChange={(value) => setSelectedTone(value as ToneOption)}
              className="grid gap-3 sm:grid-cols-2"
            >
              {toneOptions.map((option) => (
                <div
                  key={option.value}
                  className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent ${
                    selectedTone === option.value
                      ? "border-primary bg-accent/50"
                      : "border-border"
                  }`}
                  onClick={() => setSelectedTone(option.value)}
                >
                  <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor={option.value} className="cursor-pointer font-medium">
                      {option.label}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {option.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              This will use {CREDIT_COSTS.GENERATE_RESPONSE} credit
            </p>
            <Button onClick={handleGenerate} disabled={isGenerating}>
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
          </div>
        </CardContent>
      </Card>

      {/* Out of credits dialog */}
      <OutOfCreditsDialog
        open={showOutOfCreditsDialog}
        onOpenChange={setShowOutOfCreditsDialog}
        creditsRemaining={credits}
        creditsTotal={creditsTotal}
        resetDate={creditsResetDate ?? undefined}
        actionType="generate"
        currentPhase={currentPhase}
        isBetaUser={isBetaUser}
        submitterName={session?.user?.name ?? null}
        submitterEmail={session?.user?.email ?? null}
        submitterBusinessName={organizationName}
      />
    </div>
  );
}

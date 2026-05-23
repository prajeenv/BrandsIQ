"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CreditCard,
  MessageSquare,
  BarChart3,
  TrendingUp,
  Brain,
  Plus,
  Star,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  StatsCard,
  QuotaCard,
  SentimentDistributionCard,
  EmptyReviews,
  LowCreditWarning,
  BrandVoiceIncompleteBanner,
} from "@/components/dashboard";
import { useCredits } from "@/components/providers/CreditsProvider";

interface DashboardStats {
  credits: {
    remaining: number;
    total: number;
    used: number;
    resetDate: string;
  };
  sentiment: {
    remaining: number;
    total: number;
    used: number;
    resetDate: string;
  };
  tier: string;
  isBetaUser: boolean;
  brandVoiceWarnings?: {
    negativeEmailToggleOnButReplyToEmailMissing: boolean;
  };
  stats: {
    totalReviews: number;
    totalResponses: number;
    avgEditRate: number;
  };
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
    total: number;
  };
  recentReviews: Array<{
    id: string;
    platform: string;
    reviewText: string;
    rating: number | null;
    sentiment: string | null;
    reviewDate: string | null;
    createdAt: string;
    hasResponse: boolean;
  }>;
}

function getSentimentColor(sentiment: string | null) {
  switch (sentiment) {
    case "positive":
      return "bg-green-100 text-green-800";
    case "negative":
      return "bg-red-100 text-red-800";
    case "neutral":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-600";
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

export default function DashboardPage() {
  const { data: session } = useSession();
  const { currentPhase, organizationName } = useCredits();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/dashboard/stats");
        const data = await response.json();

        if (data.success) {
          setStats(data.data);
        } else {
          setError(data.error?.message || "Failed to load dashboard data");
          toast.error("Failed to load dashboard data");
        }
      } catch {
        setError("Unable to connect to server");
        toast.error("Unable to connect to server");
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, []);

  const userName = session?.user?.name?.split(" ")[0] || "there";

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome back, {userName}!
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s an overview of your review management activity.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/reviews/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Review
          </Link>
        </Button>
      </div>

      {/* Low credit warning */}
      {!isLoading && stats && (
        <LowCreditWarning
          creditsRemaining={stats.credits.remaining}
          creditsTotal={stats.credits.total}
          tier={stats.tier}
          resetDate={stats.credits.resetDate}
          sentimentRemaining={stats.sentiment.remaining}
          sentimentTotal={stats.sentiment.total}
          sentimentResetDate={stats.sentiment.resetDate}
          currentPhase={currentPhase}
          isBetaUser={stats.isBetaUser}
          submitterName={session?.user?.name ?? null}
          submitterEmail={session?.user?.email ?? null}
          submitterBusinessName={organizationName}
        />
      )}

      {/* Brand-voice incomplete-config feedback. Separate from the
          low-credit banner so that BOTH can show simultaneously — they're
          unrelated problems and condensing them would force a priority
          choice we don't have evidence for. */}
      {!isLoading && stats?.brandVoiceWarnings?.negativeEmailToggleOnButReplyToEmailMissing && (
        <BrandVoiceIncompleteBanner
          userId={session?.user?.id ?? null}
          warning="negativeEmailToggleOnButReplyToEmailMissing"
        />
      )}

      {/* Quota cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <QuotaCard
          title="Response Credits"
          used={stats?.credits.used ?? 0}
          total={stats?.credits.total ?? 0}
          resetDate={stats?.credits.resetDate}
          icon={CreditCard}
          isLoading={isLoading}
        />
        <QuotaCard
          title="Sentiment Analysis"
          used={stats?.sentiment.used ?? 0}
          total={stats?.sentiment.total ?? 0}
          resetDate={stats?.sentiment.resetDate}
          icon={Brain}
          isLoading={isLoading}
        />
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Total Reviews"
          value={stats?.stats.totalReviews ?? 0}
          description="All time"
          icon={MessageSquare}
          isLoading={isLoading}
        />
        <StatsCard
          title="AI Responses"
          value={stats?.stats.totalResponses ?? 0}
          description="Generated responses"
          icon={BarChart3}
          isLoading={isLoading}
        />
        <StatsCard
          title="Edit Rate"
          value={`${stats?.stats.avgEditRate ?? 0}%`}
          description="Responses edited before use"
          icon={TrendingUp}
          isLoading={isLoading}
        />
      </div>

      {/* Sentiment distribution */}
      <SentimentDistributionCard
        positive={stats?.sentimentDistribution?.positive ?? 0}
        neutral={stats?.sentimentDistribution?.neutral ?? 0}
        negative={stats?.sentimentDistribution?.negative ?? 0}
        total={stats?.sentimentDistribution?.total ?? 0}
        isLoading={isLoading}
      />

      {/* Recent reviews section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Reviews</h2>
          {(stats?.stats.totalReviews ?? 0) > 0 && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/reviews">View all</Link>
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="border-destructive/50">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : stats?.recentReviews && stats.recentReviews.length > 0 ? (
          <div className="space-y-4">
            {stats.recentReviews.map((review) => (
              <Link key={review.id} href={`/dashboard/reviews/${review.id}`}>
                <Card className="transition-shadow hover:shadow-md cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Platform icon / rating */}
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
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {review.platform}
                          </Badge>
                          {review.sentiment && (
                            <Badge
                              className={`text-xs ${getSentimentColor(review.sentiment)}`}
                              variant="secondary"
                            >
                              {review.sentiment}
                            </Badge>
                          )}
                          {review.hasResponse && (
                            <Badge variant="secondary" className="text-xs">
                              Responded
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm line-clamp-2">{review.reviewText}</p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {review.reviewDate
                            ? `Reviewed ${formatTimeAgo(review.reviewDate)}`
                            : `Added ${formatTimeAgo(review.createdAt)}`}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyReviews />
        )}
      </div>
    </div>
  );
}

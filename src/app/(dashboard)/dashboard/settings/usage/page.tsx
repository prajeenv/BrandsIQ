"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Sparkles,
  RefreshCw,
  Undo2,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ============================================
// TYPES
// ============================================

interface ResponseUsageRecord {
  id: string;
  date: string;
  action: string;
  actionLabel: string;
  creditsUsed: number;
  reviewPreview: string | null;
  reviewId: string | null;
  platform: string | null;
  reviewerName: string | null;
  toneUsed: string | null;
  rating: number | null;
  isDeleted: boolean;
}

interface SentimentUsageRecord {
  id: string;
  sentiment: string;
  createdAt: string;
  reviewId: string | null;
  platform: string | null;
  rating: number | null;
  preview: string | null;
  isDeleted: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface ResponseUsageData {
  records: ResponseUsageRecord[];
  pagination: Pagination;
}

interface SentimentUsageData {
  usage: SentimentUsageRecord[];
  pagination: Pagination;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 172800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getActionIcon(action: string) {
  switch (action) {
    case "GENERATE_RESPONSE":
      return <Sparkles className="h-4 w-4 text-blue-500" />;
    case "REGENERATE":
      return <RefreshCw className="h-4 w-4 text-purple-500" />;
    case "REFUND":
      return <Undo2 className="h-4 w-4 text-green-500" />;
    default:
      return <Sparkles className="h-4 w-4" />;
  }
}

function getActionBadgeVariant(action: string) {
  switch (action) {
    case "GENERATE_RESPONSE":
      return "default";
    case "REGENERATE":
      return "secondary";
    case "REFUND":
      return "outline";
    default:
      return "default";
  }
}

function getSentimentBadgeColor(sentiment: string): string {
  switch (sentiment) {
    case "positive":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "negative":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    case "neutral":
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  }
}

// ============================================
// DELETED REVIEW ID COMPONENT
// ============================================

function DeletedReviewId({ reviewId }: { reviewId: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="font-mono text-xs text-muted-foreground/70 hover:text-muted-foreground cursor-pointer transition-colors"
        title={expanded ? "Click to collapse" : "Click to show full ID"}
      >
        ({expanded ? reviewId : reviewId.slice(0, 8)})
      </button>
      <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
        Deleted
      </Badge>
    </span>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function UsagePage() {
  const [activeTab, setActiveTab] = useState<"response" | "sentiment">("response");

  // Response credits state
  const [responseData, setResponseData] = useState<ResponseUsageData | null>(null);
  const [responseLoading, setResponseLoading] = useState(true);
  const [responsePage, setResponsePage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [responseStartDate, setResponseStartDate] = useState("");
  const [responseEndDate, setResponseEndDate] = useState("");

  // Sentiment credits state
  const [sentimentData, setSentimentData] = useState<SentimentUsageData | null>(null);
  const [sentimentLoading, setSentimentLoading] = useState(true);
  const [sentimentPage, setSentimentPage] = useState(1);
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");
  const [sentimentStartDate, setSentimentStartDate] = useState("");
  const [sentimentEndDate, setSentimentEndDate] = useState("");

  // ============================================
  // FETCH FUNCTIONS
  // ============================================

  const fetchResponseUsage = useCallback(async () => {
    setResponseLoading(true);
    try {
      const params = new URLSearchParams({
        page: responsePage.toString(),
        limit: "20",
      });

      if (actionFilter && actionFilter !== "all") {
        params.append("action", actionFilter);
      }
      if (responseStartDate) {
        params.append("startDate", new Date(responseStartDate).toISOString());
      }
      if (responseEndDate) {
        params.append("endDate", new Date(responseEndDate).toISOString());
      }

      const response = await fetch(`/api/credits/usage?${params}`);
      const result = await response.json();

      if (result.success) {
        setResponseData(result.data);
      } else {
        toast.error(result.error?.message || "Failed to load response credit history");
      }
    } catch {
      toast.error("Unable to connect to server");
    } finally {
      setResponseLoading(false);
    }
  }, [responsePage, actionFilter, responseStartDate, responseEndDate]);

  const fetchSentimentUsage = useCallback(async () => {
    setSentimentLoading(true);
    try {
      const params = new URLSearchParams({
        page: sentimentPage.toString(),
        limit: "20",
      });

      if (sentimentFilter && sentimentFilter !== "all") {
        params.append("sentiment", sentimentFilter);
      }
      if (sentimentStartDate) {
        params.append("startDate", new Date(sentimentStartDate).toISOString());
      }
      if (sentimentEndDate) {
        params.append("endDate", new Date(sentimentEndDate).toISOString());
      }

      const response = await fetch(`/api/sentiment/usage?${params}`);
      const result = await response.json();

      if (result.success) {
        setSentimentData(result.data);
      } else {
        toast.error(result.error?.message || "Failed to load sentiment credit history");
      }
    } catch {
      toast.error("Unable to connect to server");
    } finally {
      setSentimentLoading(false);
    }
  }, [sentimentPage, sentimentFilter, sentimentStartDate, sentimentEndDate]);

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    if (activeTab === "response") {
      fetchResponseUsage();
    }
  }, [activeTab, fetchResponseUsage]);

  useEffect(() => {
    if (activeTab === "sentiment") {
      fetchSentimentUsage();
    }
  }, [activeTab, fetchSentimentUsage]);

  // ============================================
  // EXPORT FUNCTIONS
  // ============================================

  const handleExportResponseCSV = () => {
    if (!responseData || responseData.records.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = ["Date", "Action", "Credits Used", "Platform", "Reviewer", "Review Preview"];
    const rows = responseData.records.map((record) => [
      format(new Date(record.date), "yyyy-MM-dd HH:mm:ss"),
      record.actionLabel,
      record.creditsUsed.toString(),
      record.platform || "",
      record.reviewerName || "",
      record.reviewPreview?.replace(/"/g, '""') || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `response-credit-usage-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();

    toast.success("Response credit history exported");
  };

  const handleExportSentimentCSV = () => {
    if (!sentimentData || sentimentData.usage.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = ["Date", "Sentiment", "Credits", "Platform", "Rating", "Review Preview"];
    const rows = sentimentData.usage.map((record) => [
      format(new Date(record.createdAt), "yyyy-MM-dd HH:mm:ss"),
      record.sentiment,
      "-1",
      record.platform || "",
      record.rating?.toString() || "",
      record.preview?.replace(/"/g, '""') || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `sentiment-credit-usage-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();

    toast.success("Sentiment credit history exported");
  };

  // ============================================
  // CLEAR FILTER FUNCTIONS
  // ============================================

  const handleClearResponseFilters = () => {
    setActionFilter("all");
    setResponseStartDate("");
    setResponseEndDate("");
    setResponsePage(1);
  };

  const handleClearSentimentFilters = () => {
    setSentimentFilter("all");
    setSentimentStartDate("");
    setSentimentEndDate("");
    setSentimentPage(1);
  };

  const hasResponseFilters = actionFilter !== "all" || responseStartDate || responseEndDate;
  const hasSentimentFilters = sentimentFilter !== "all" || sentimentStartDate || sentimentEndDate;

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Credit History</h1>
          <p className="text-muted-foreground">
            View your response and sentiment credit usage history
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "response" | "sentiment")}>
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="response">Response Credits</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment Credits</TabsTrigger>
        </TabsList>

        {/* Response Credits Tab */}
        <TabsContent value="response" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </CardTitle>
                {hasResponseFilters && (
                  <Button variant="ghost" size="sm" onClick={handleClearResponseFilters}>
                    Clear filters
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-muted-foreground">Action Type</label>
                  <Select value={actionFilter} onValueChange={(value) => {
                    setActionFilter(value);
                    setResponsePage(1);
                  }}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All actions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All actions</SelectItem>
                      <SelectItem value="GENERATE_RESPONSE">Generate Response</SelectItem>
                      <SelectItem value="REGENERATE">Regenerate Response</SelectItem>
                      <SelectItem value="REFUND">Credit Refund</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-muted-foreground">Start Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={responseStartDate}
                      onChange={(e) => {
                        setResponseStartDate(e.target.value);
                        setResponsePage(1);
                      }}
                      className="w-[180px] pl-10"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-muted-foreground">End Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={responseEndDate}
                      onChange={(e) => {
                        setResponseEndDate(e.target.value);
                        setResponsePage(1);
                      }}
                      className="w-[180px] pl-10"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 justify-end">
                  <label className="text-sm text-muted-foreground invisible">Export</label>
                  <Button variant="outline" onClick={handleExportResponseCSV} disabled={responseLoading || !responseData?.records.length}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Response Usage Table */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Records</CardTitle>
              <CardDescription>
                {responseData?.pagination.totalCount
                  ? `Showing ${(responseData.pagination.page - 1) * responseData.pagination.limit + 1}-${Math.min(responseData.pagination.page * responseData.pagination.limit, responseData.pagination.totalCount)} of ${responseData.pagination.totalCount} records`
                  : "No records found"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {responseLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-24" />
                      <Skeleton className="h-10 flex-1" />
                      <Skeleton className="h-10 w-20" />
                    </div>
                  ))}
                </div>
              ) : responseData?.records && responseData.records.length > 0 ? (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">Date</TableHead>
                          <TableHead className="w-[120px]">Action</TableHead>
                          <TableHead className="w-[50px]">Credits</TableHead>
                          <TableHead className="hidden sm:table-cell w-[80px]">Platform</TableHead>
                          <TableHead className="hidden md:table-cell">Review</TableHead>
                          <TableHead className="hidden lg:table-cell w-[90px]">Tone</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {responseData.records.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium whitespace-nowrap">
                              {formatTimeAgo(record.date)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getActionIcon(record.action)}
                                <Badge variant={getActionBadgeVariant(record.action) as "default" | "secondary" | "outline"}>
                                  {record.actionLabel}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={record.creditsUsed < 0 ? "text-green-600" : ""}>
                                {record.creditsUsed > 0 ? `-${record.creditsUsed}` : `+${Math.abs(record.creditsUsed)}`}
                              </span>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell w-[80px]">
                              {record.platform ? (
                                <Badge variant="outline" className="capitalize text-xs">
                                  {record.platform}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {record.reviewPreview ? (
                                <Link
                                  href={`/dashboard/reviews/${record.reviewId}`}
                                  className="text-sm text-muted-foreground hover:text-foreground truncate block"
                                >
                                  {record.reviewPreview}
                                </Link>
                              ) : record.isDeleted && record.reviewId ? (
                                <DeletedReviewId reviewId={record.reviewId} />
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {record.toneUsed ? (
                                <Badge variant="outline" className="capitalize text-xs">
                                  {record.toneUsed}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {responseData.pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Page {responseData.pagination.page} of {responseData.pagination.totalPages}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setResponsePage((p) => Math.max(1, p - 1))}
                          disabled={!responseData.pagination.hasPrevPage}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setResponsePage((p) => p + 1)}
                          disabled={!responseData.pagination.hasNextPage}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <Sparkles className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">No usage records yet</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Your response credit usage history will appear here once you start generating responses.
                  </p>
                  <Button className="mt-4" asChild>
                    <Link href="/dashboard/reviews">
                      View Reviews
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sentiment Credits Tab */}
        <TabsContent value="sentiment" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </CardTitle>
                {hasSentimentFilters && (
                  <Button variant="ghost" size="sm" onClick={handleClearSentimentFilters}>
                    Clear filters
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-muted-foreground">Sentiment</label>
                  <Select value={sentimentFilter} onValueChange={(value) => {
                    setSentimentFilter(value);
                    setSentimentPage(1);
                  }}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All sentiments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All sentiments</SelectItem>
                      <SelectItem value="positive">Positive</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="negative">Negative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-muted-foreground">Start Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={sentimentStartDate}
                      onChange={(e) => {
                        setSentimentStartDate(e.target.value);
                        setSentimentPage(1);
                      }}
                      className="w-[180px] pl-10"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-muted-foreground">End Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={sentimentEndDate}
                      onChange={(e) => {
                        setSentimentEndDate(e.target.value);
                        setSentimentPage(1);
                      }}
                      className="w-[180px] pl-10"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 justify-end">
                  <label className="text-sm text-muted-foreground invisible">Export</label>
                  <Button variant="outline" onClick={handleExportSentimentCSV} disabled={sentimentLoading || !sentimentData?.usage.length}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sentiment Usage Table */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Records</CardTitle>
              <CardDescription>
                {sentimentData?.pagination.totalCount
                  ? `Showing ${(sentimentData.pagination.page - 1) * sentimentData.pagination.limit + 1}-${Math.min(sentimentData.pagination.page * sentimentData.pagination.limit, sentimentData.pagination.totalCount)} of ${sentimentData.pagination.totalCount} records`
                  : "No records found"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sentimentLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-24" />
                      <Skeleton className="h-10 flex-1" />
                      <Skeleton className="h-10 w-20" />
                    </div>
                  ))}
                </div>
              ) : sentimentData?.usage && sentimentData.usage.length > 0 ? (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Sentiment</TableHead>
                          <TableHead>Credits</TableHead>
                          <TableHead className="hidden sm:table-cell">Platform</TableHead>
                          <TableHead className="hidden md:table-cell">Review</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sentimentData.usage.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium whitespace-nowrap">
                              {formatTimeAgo(record.createdAt)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Brain className="h-4 w-4 text-purple-500" />
                                <Badge className={`capitalize ${getSentimentBadgeColor(record.sentiment)}`}>
                                  {record.sentiment}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>-1</TableCell>
                            <TableCell className="hidden sm:table-cell">
                              {record.platform ? (
                                <Badge variant="outline" className="capitalize text-xs">
                                  {record.platform}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell max-w-[200px]">
                              {record.preview ? (
                                <Link
                                  href={`/dashboard/reviews/${record.reviewId}`}
                                  className="text-sm text-muted-foreground hover:text-foreground truncate block"
                                >
                                  {record.preview}
                                </Link>
                              ) : record.isDeleted && record.reviewId ? (
                                <DeletedReviewId reviewId={record.reviewId} />
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {sentimentData.pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Page {sentimentData.pagination.page} of {sentimentData.pagination.totalPages}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSentimentPage((p) => Math.max(1, p - 1))}
                          disabled={!sentimentData.pagination.hasPrevPage}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSentimentPage((p) => p + 1)}
                          disabled={!sentimentData.pagination.hasNextPage}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <Brain className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">No sentiment records yet</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Your sentiment credit usage history will appear here once you start adding reviews.
                  </p>
                  <Button className="mt-4" asChild>
                    <Link href="/dashboard/reviews/new">
                      Add Review
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

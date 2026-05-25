"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MessageSquare,
  Loader2,
  Check,
  RotateCcw,
  Mail,
  Briefcase,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/utils";
import { FOUNDER_INQUIRY_TYPES, VALIDATION_LIMITS } from "@/lib/constants";
import type { FounderInquiryType } from "@/lib/constants";

interface InquiryRow {
  id: string;
  type: FounderInquiryType;
  source: string | null;
  submitterName: string | null;
  submitterEmail: string | null;
  businessName: string | null;
  message: string;
  createdAt: string;
  resolvedAt: string | null;
  founderNotes: string | null;
  user: { id: string; email: string | null; name: string | null; isBetaUser: boolean; tier: string } | null;
}

const TYPE_LABEL: Record<FounderInquiryType, string> = {
  beta_request: "Beta request",
  more_credits: "More credits",
  general: "General",
  expired_link_recovery: "Expired link",
};

const TYPE_BADGE_VARIANT: Record<FounderInquiryType, "default" | "secondary" | "outline"> = {
  beta_request: "default",
  more_credits: "secondary",
  general: "outline",
  expired_link_recovery: "outline",
};

export default function FounderInquiriesAdminPage() {
  const [inquiries, setInquiries] = useState<InquiryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | FounderInquiryType>("all");
  const [resolvedFilter, setResolvedFilter] = useState<"all" | "true" | "false">("false");
  const [activeInquiry, setActiveInquiry] = useState<InquiryRow | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (resolvedFilter !== "all") params.set("resolved", resolvedFilter);
      // page=1, limit=50 — admin volumes are small; pagination UI can land later
      params.set("limit", "50");

      const res = await fetch(`/api/admin/founder-inquiries?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load inquiries");
      }
      const json = await res.json();
      setInquiries(json.data?.inquiries ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inquiries");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, resolvedFilter]);

  useEffect(() => {
    loadInquiries();
  }, [loadInquiries]);

  const openDetails = (inquiry: InquiryRow) => {
    setActiveInquiry(inquiry);
    setNotesDraft(inquiry.founderNotes ?? "");
  };

  const closeDetails = () => {
    setActiveInquiry(null);
    setNotesDraft("");
  };

  const updateInquiry = async (
    inquiryId: string,
    update: { resolved?: boolean; founderNotes?: string | null },
  ) => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/founder-inquiries/${inquiryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Failed to update inquiry");
      }
      // Reload the list so filters reflect any state change (e.g. just-resolved
      // disappears from the "unresolved" filter).
      await loadInquiries();
      closeDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update inquiry");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <div className="flex items-center gap-3">
        <MessageSquare className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Founder inquiries</h1>
          <p className="text-sm text-muted-foreground">
            Beta-access requests, more-credits requests, and recovery inquiries
            submitted by users. Reply to the notification email or click into
            an inquiry to mark it resolved.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Default view shows unresolved inquiries. Switch the resolved
            filter to see your full history.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="type-filter">Type</Label>
            <Select
              value={typeFilter}
              onValueChange={(value) => setTypeFilter(value as typeof typeFilter)}
            >
              <SelectTrigger id="type-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {FOUNDER_INQUIRY_TYPES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {TYPE_LABEL[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="resolved-filter">Status</Label>
            <Select
              value={resolvedFilter}
              onValueChange={(value) => setResolvedFilter(value as typeof resolvedFilter)}
            >
              <SelectTrigger id="resolved-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Unresolved</SelectItem>
                <SelectItem value="true">Resolved</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inquiries</CardTitle>
          <CardDescription>
            {loading
              ? "Loading..."
              : inquiries.length === 0
                ? "No inquiries match the current filters."
                : `${inquiries.length} inquir${inquiries.length === 1 ? "y" : "ies"}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading inquiries...
            </div>
          ) : inquiries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing here yet — once users submit the founder-inquiry form, the
              inquiries will land in this table.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Type</th>
                    <th className="py-2 pr-4 font-medium">Submitter</th>
                    <th className="py-2 pr-4 font-medium">Business</th>
                    <th className="py-2 pr-4 font-medium">Submitted</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium" aria-label="Actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {inquiries.map((inquiry) => {
                    const isResolved = !!inquiry.resolvedAt;
                    return (
                      <tr key={inquiry.id} className="border-b last:border-b-0">
                        <td className="py-3 pr-4">
                          <Badge variant={TYPE_BADGE_VARIANT[inquiry.type]}>
                            {TYPE_LABEL[inquiry.type]}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="space-y-0.5">
                            <div>{inquiry.submitterName ?? "-"}</div>
                            {inquiry.submitterEmail && (
                              <a
                                href={`mailto:${inquiry.submitterEmail}`}
                                className="text-xs text-muted-foreground hover:text-foreground"
                              >
                                {inquiry.submitterEmail}
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {inquiry.businessName ?? "-"}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {formatDateTime(inquiry.createdAt)}
                        </td>
                        <td className="py-3 pr-4">
                          {isResolved ? (
                            <Badge variant="secondary">Resolved</Badge>
                          ) : (
                            <Badge variant="default">Open</Badge>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openDetails(inquiry)}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details + actions dialog */}
      <Dialog open={!!activeInquiry} onOpenChange={(open) => !open && closeDetails()}>
        <DialogContent className="sm:max-w-lg">
          {activeInquiry && (
            <>
              <DialogHeader>
                <DialogTitle>{TYPE_LABEL[activeInquiry.type]}</DialogTitle>
                <DialogDescription>
                  Submitted {formatDateTime(activeInquiry.createdAt)}
                  {activeInquiry.source ? ` (via ${activeInquiry.source})` : ""}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                <div className="grid gap-2 text-sm">
                  {activeInquiry.submitterName && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-20">Name</span>
                      <span>{activeInquiry.submitterName}</span>
                    </div>
                  )}
                  {activeInquiry.submitterEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`mailto:${activeInquiry.submitterEmail}`}
                        className="text-primary hover:underline"
                      >
                        {activeInquiry.submitterEmail}
                      </a>
                    </div>
                  )}
                  {activeInquiry.businessName && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span>{activeInquiry.businessName}</span>
                    </div>
                  )}
                  {activeInquiry.user && (
                    <div className="text-xs text-muted-foreground">
                      Linked account: {activeInquiry.user.email} · tier {activeInquiry.user.tier}
                      {activeInquiry.user.isBetaUser ? " · beta" : ""}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Message</Label>
                  <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                    {activeInquiry.message}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="founder-notes">Founder notes</Label>
                  <Textarea
                    id="founder-notes"
                    placeholder="Notes about how this was resolved, follow-ups, etc."
                    rows={3}
                    maxLength={VALIDATION_LIMITS.FOUNDER_NOTES_MAX}
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    disabled={actionLoading}
                  />
                </div>
              </div>

              <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={closeDetails}
                  disabled={actionLoading}
                  className="sm:mr-auto"
                >
                  Close
                </Button>
                {activeInquiry.resolvedAt ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      updateInquiry(activeInquiry.id, {
                        resolved: false,
                        founderNotes: notesDraft || null,
                      })
                    }
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="mr-2 h-4 w-4" />
                    )}
                    Re-open
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() =>
                      updateInquiry(activeInquiry.id, {
                        resolved: true,
                        founderNotes: notesDraft || null,
                      })
                    }
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 h-4 w-4" />
                    )}
                    Mark resolved
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

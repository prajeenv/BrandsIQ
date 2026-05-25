"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Plus, Loader2, Check, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/utils";

type InviteStatus = "active" | "used" | "expired";

interface InviteRow {
  id: string;
  code: string;
  notes: string | null;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  usedBy: { id: string; email: string | null; name: string | null } | null;
  status: InviteStatus;
}

interface GeneratedInvite {
  id: string;
  code: string;
  notes: string | null;
  createdAt: string;
  expiresAt: string;
  url: string;
}

const STATUS_BADGE: Record<InviteStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
  active: { label: "Active", variant: "default" },
  used: { label: "Used", variant: "secondary" },
  expired: { label: "Expired", variant: "outline" },
};

export default function BetaInvitesAdminPage() {
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [notes, setNotes] = useState("");
  const [justGenerated, setJustGenerated] = useState<GeneratedInvite | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadInvites = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/beta-invites");
      if (!res.ok) {
        throw new Error("Failed to load invites");
      }
      const json = await res.json();
      setInvites(json.data?.invites ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invites");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const handleGenerate = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/beta-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? "Failed to generate invite");
      }
      setJustGenerated(json.data.invite);
      setNotes("");
      await loadInvites();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate invite");
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 2000);
    } catch {
      // ignore — desktops without clipboard API are rare; nothing actionable
    }
  };

  const buildInviteUrl = (code: string): string => {
    if (typeof window === "undefined") return `/auth/signup?b=${code}`;
    return `${window.location.origin}/auth/signup?b=${code}`;
  };

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Beta invites</h1>
          <p className="text-sm text-muted-foreground">
            Generate single-use signup links for closed-beta prospects. Each
            link is valid for 60 days and can only be used once.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate a new invite</CardTitle>
          <CardDescription>
            Optionally add notes (e.g. who this invite is for). Visible only
            to you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="e.g. Sent via DM to @cafe_arabica on 2026-05-12"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                maxLength={500}
                disabled={creating}
              />
            </div>
            <Button type="submit" disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Generate invite
                </>
              )}
            </Button>
          </form>

          {justGenerated && (
            <div className="mt-4 rounded-md border bg-primary/5 p-4 space-y-2">
              <p className="text-sm font-semibold">New invite ready to share:</p>
              <div className="flex items-center gap-2">
                <Input value={justGenerated.url} readOnly className="font-mono text-xs" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(justGenerated.id, justGenerated.url)}
                >
                  {copiedId === justGenerated.id ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Expires {formatDateTime(justGenerated.expiresAt)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All invites</CardTitle>
          <CardDescription>
            {invites.length === 0
              ? "No invites generated yet."
              : `${invites.length} invite${invites.length === 1 ? "" : "s"}`}
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
              Loading invites...
            </div>
          ) : invites.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Generate your first invite above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Code</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Created</th>
                    <th className="py-2 pr-4 font-medium">Expires</th>
                    <th className="py-2 pr-4 font-medium">Used by</th>
                    <th className="py-2 pr-4 font-medium">Notes</th>
                    <th className="py-2 pr-4 font-medium" aria-label="Actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((invite) => {
                    const badge = STATUS_BADGE[invite.status];
                    return (
                      <tr key={invite.id} className="border-b last:border-b-0">
                        <td className="py-3 pr-4 font-mono text-xs">{invite.code}</td>
                        <td className="py-3 pr-4">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {formatDateTime(invite.createdAt)}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {formatDateTime(invite.expiresAt)}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {invite.usedBy?.email ?? "-"}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground max-w-[200px] truncate">
                          {invite.notes ?? "-"}
                        </td>
                        <td className="py-3 pr-4 text-right">
                          {invite.status === "active" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                copyToClipboard(invite.id, buildInviteUrl(invite.code))
                              }
                              title="Copy invite URL"
                            >
                              {copiedId === invite.id ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          )}
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
    </div>
  );
}

"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "@/components/settings";

/**
 * /dashboard/settings/profile — edit the fields captured at /onboarding plus
 * display name. Replaces the "Coming Soon" placeholder on the settings index.
 *
 * Out of scope (file as separate work):
 *  - Email change (needs re-verification flow)
 *  - Password change UI (existing /auth/forgot-password flow is linked)
 *  - GDPR data export / account deletion
 */
export default function ProfileSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground mt-2">
            Update your account and business details.
          </p>
        </div>
      </div>

      <ProfileForm />
    </div>
  );
}

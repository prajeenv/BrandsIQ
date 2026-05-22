"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandVoiceForm } from "@/components/settings";

export default function BrandVoiceSettingsPage() {
  // The page title + descriptor + SaveStatusIndicator live inside
  // `BrandVoiceForm` (iter-7 hierarchy pass). The page surface just owns
  // the back-arrow chrome.
  //
  // Card-contrast pass — the brand voice page tints its surface to
  // `slate-50` so the white section Cards sit visibly on top as figures
  // on a ground. We do this here (route-scoped) rather than globally on
  // the dashboard layout because the rest of the dashboard hasn't been
  // restyled to expect a tinted surface yet. The negative margin +
  // padding pair lets the tint bleed past the dashboard's content
  // padding to the visible page edges; if `slate-50` shows seams on
  // narrow viewports we can swap to `mx-0` later.
  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-4 sm:-my-6 lg:-my-8 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 bg-slate-50 dark:bg-slate-950 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild className="-ml-3">
          <Link href="/dashboard/settings">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to settings
          </Link>
        </Button>

        <BrandVoiceForm />
      </div>
    </div>
  );
}

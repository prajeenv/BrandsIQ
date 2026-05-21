"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandVoiceForm } from "@/components/settings";

export default function BrandVoiceSettingsPage() {
  // The page title + descriptor + SaveStatusIndicator live inside
  // `BrandVoiceForm` (iter-7 hierarchy pass). The page surface just owns
  // the back-arrow chrome.
  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-3">
        <Link href="/dashboard/settings">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to settings
        </Link>
      </Button>

      <BrandVoiceForm />
    </div>
  );
}

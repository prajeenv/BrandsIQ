import Link from "next/link";
import { Metadata } from "next";
import { AlertCircle } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FounderInquiryForm } from "@/components/shared";

export const metadata: Metadata = {
  title: "Beta invite expired - BrandsIQ",
  description:
    "This BrandsIQ beta invite link has expired or has already been used.",
};

/**
 * /auth/beta-link-expired
 *
 * Shown when a user clicks an expired or already-used invite link, or when
 * the signup route rejects an invite mid-submission. See MVP.md Section 13.3.
 *
 * Iteration 2: replaces the iteration-1 mailto fallback with the embedded
 * FounderInquiryForm. The form posts to POST /api/founder-inquiries which
 * stores the inquiry and emails the founder.
 */
export default function BetaLinkExpiredPage() {
  return (
    <Card>
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <AlertCircle className="h-6 w-6 text-amber-600" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">
          This beta invite link has expired
        </CardTitle>
        <CardDescription>
          Your invite has expired or has already been used.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FounderInquiryForm
          type="expired_link_recovery"
          source="expired_link"
        />

        <div className="border-t pt-4 space-y-2">
          <p className="text-center text-sm text-muted-foreground">
            Or, if you&apos;d like to try BrandsIQ on the free tier:
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/auth/signup">Continue with regular signup &rarr;</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/auth/signin">Already have an account? Sign in</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

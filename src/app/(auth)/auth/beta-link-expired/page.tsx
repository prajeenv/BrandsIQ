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
 * Iteration 1: shows the page copy + "Continue with regular signup" link.
 * The embedded recovery form (FounderInquiryForm) lands in iteration 2 —
 * for now, the founder is reachable via the support email link.
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
        <div className="rounded-md bg-muted/30 p-4 text-sm text-muted-foreground">
          If you received this link recently and expected beta access, email{" "}
          <a
            href="mailto:prajeen.builder@gmail.com?subject=BrandsIQ%20beta%20invite%20-%20expired%20link"
            className="text-primary underline hover:no-underline"
          >
            prajeen.builder@gmail.com
          </a>{" "}
          and we&apos;ll send a fresh invite within 24 hours.
          <p className="mt-3 text-xs">
            (A built-in recovery form is coming soon — for now the email above
            is the fastest path.)
          </p>
        </div>

        <div className="flex flex-col gap-2">
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

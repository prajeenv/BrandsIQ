import Link from "next/link";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { Rocket } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FounderInquiryForm } from "@/components/shared";
import { getCurrentPhase } from "@/lib/system-phase";

export const metadata: Metadata = {
  title: "Start your free beta - BrandsIQ",
  description:
    "Request access to the BrandsIQ closed beta, or continue with regular signup.",
};

/**
 * /auth/get-started
 *
 * Gateway for the walk-in "Start free beta" CTA. BrandsIQ is in closed beta,
 * so rather than dropping a just-met visitor straight into the signup form we
 * offer two paths: request beta access (the founder follows up), or continue
 * to regular free-tier signup.
 *
 * Phase-aware: under phase_2 (commercial launch, no closed beta) there is no
 * beta to request, so we redirect to /auth/signup, preserving utm_source.
 */

// Build a /auth/signup href that preserves the incoming utm_source. The signup
// form reads utm_source itself (client-side via useSearchParams), so we only
// need to keep the param in the URL — no prop plumbing. Absent → bare signup.
function signupHref(utmSource: string | undefined): string {
  return utmSource
    ? `/auth/signup?utm_source=${encodeURIComponent(utmSource)}`
    : "/auth/signup";
}

export default function GetStartedPage({
  searchParams,
}: {
  // Next 14 App Router: searchParams is a synchronous plain object.
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // A query param can arrive as string | string[] (repeated key). Normalise to
  // the first value; undefined when absent.
  const raw = searchParams.utm_source;
  const utmSource = Array.isArray(raw) ? raw[0] : raw;

  // Phase 2: no closed beta to request — send straight to regular signup,
  // preserving attribution. redirect() throws NEXT_REDIRECT, so it must stay
  // at the top level (no try/catch around it).
  if (getCurrentPhase() === "phase_2") {
    redirect(signupHref(utmSource));
  }

  // Phase 1 (default, closed beta): request-beta access + signup fallback.
  return (
    <Card>
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
            <Rocket className="h-6 w-6 text-brand-600" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Start your free beta</CardTitle>
        <CardDescription>
          BrandsIQ is currently invite-only. Request access below and
          we&apos;ll be in touch within 24 hours.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FounderInquiryForm type="beta_request" source="signup_gateway" />

        <div className="border-t pt-4 space-y-2">
          <p className="text-center text-sm text-muted-foreground">
            Already have an invite, or want to start on the free tier?
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href={signupHref(utmSource)}>
              Continue with regular signup &rarr;
            </Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href="/auth/signin">Already have an account? Sign in</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

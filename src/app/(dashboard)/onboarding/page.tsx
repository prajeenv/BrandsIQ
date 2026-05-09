import Link from "next/link";
import { Metadata } from "next";
import { Sparkles } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Welcome to BrandsIQ",
  description: "Complete your profile to get started",
};

/**
 * /onboarding — placeholder in iteration 1.
 *
 * Iteration 2 replaces this with a wizard that collects organization name,
 * industry, country, location name, plus optional intent + challenge text
 * for non-beta signups. See MVP.md Section 9 and 13.5.
 *
 * Why the placeholder ships in iteration 1: NextAuth's `pages.newUser =
 * "/onboarding"` already redirects new users here. Without a page, OAuth
 * signups would land on a 404 immediately after authenticating.
 */
export default function OnboardingPage() {
  return (
    <div className="container max-w-2xl py-12">
      <Card>
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to BrandsIQ</CardTitle>
          <CardDescription>
            Your account is ready. The onboarding wizard is coming in the next
            update — for now, head straight to the dashboard and start adding
            reviews.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild>
            <Link href="/dashboard">Go to dashboard &rarr;</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

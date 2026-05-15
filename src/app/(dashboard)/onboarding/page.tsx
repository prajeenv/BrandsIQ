import { requireNotOnboarded } from "@/lib/onboarding-guard";
import { OnboardingForm } from "./onboarding-form";

/**
 * /onboarding — single-page wizard collecting profile fields per MVP.md
 * Section 9.
 *
 * Server-component wrapper: bounces already-onboarded users to /dashboard
 * via the requireNotOnboarded() guard. Unauthenticated requests fall
 * through to middleware (which redirects them to /auth/signin) — this
 * page never renders for them.
 *
 * The actual form is a client component (./onboarding-form). Server
 * guard + client form is the standard Next.js split when a route needs
 * both server-side enforcement and client-side interactivity.
 */
export default async function OnboardingPage() {
  await requireNotOnboarded();
  return <OnboardingForm />;
}

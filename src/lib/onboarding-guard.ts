import { redirect } from "next/navigation";
import { auth } from "./auth";
import { prisma } from "./prisma";

/**
 * Returns the current user's onboarding status.
 *
 * Server-side helper used by the dashboard layout and the onboarding page
 * to enforce a consistent invariant: User.organizationName non-null means
 * onboarded; null means not yet. Reading from the DB on every server-rendered
 * request is intentional — the JWT-based gate we tried first (PR #99) hit
 * staleness bugs (updateAge prevented the cookie from re-issuing when
 * onboarding submitted; users got stuck on /onboarding until signout/signin).
 *
 * Cost is negligible — a single indexed primary-key lookup, one column
 * projected. Client-side navigations within the dashboard reuse the layout
 * and skip this check; it only fires on hard refresh / first load / deep link.
 */
export async function getOnboardingStatus(): Promise<{
  authenticated: boolean;
  userId: string | null;
  hasOnboarded: boolean;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { authenticated: false, userId: null, hasOnboarded: false };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { organizationName: true },
  });

  return {
    authenticated: true,
    userId: session.user.id,
    hasOnboarded: user?.organizationName != null,
  };
}

/**
 * Server-side guard for routes that require completed onboarding. Redirects
 * to /onboarding if the user is authenticated but hasn't onboarded yet.
 *
 * Unauthenticated requests pass through here — protecting routes from
 * unauthenticated access is middleware's job. This function only enforces
 * the onboarding step.
 */
export async function requireOnboarded(): Promise<void> {
  const { authenticated, hasOnboarded } = await getOnboardingStatus();
  if (authenticated && !hasOnboarded) {
    redirect("/onboarding");
  }
}

/**
 * Mirror guard for the onboarding page itself — sends already-onboarded
 * users to the dashboard. Prevents the "form is empty when I revisit"
 * confusion the founder hit on first-pass implementation.
 */
export async function requireNotOnboarded(): Promise<void> {
  const { authenticated, hasOnboarded } = await getOnboardingStatus();
  if (authenticated && hasOnboarded) {
    redirect("/dashboard");
  }
}

import { requireOnboarded } from "@/lib/onboarding-guard";

/**
 * Server-component gate for /dashboard/*. Redirects users with null
 * User.organizationName to /onboarding. Fires once per server-rendered
 * request (full page load, hard refresh, deep link); client-side
 * navigations within the dashboard reuse the layout and skip the check.
 *
 * /onboarding lives in (dashboard)/onboarding and explicitly does NOT
 * get this gate — it's the destination, not a target.
 *
 * /dashboard/admin/* is intentionally covered by this gate as well —
 * a founder who somehow lacks organizationName should onboard first.
 * Defence is fine here since the founder account has already onboarded
 * on prod and any future admin would go through normal signup.
 */
export default async function DashboardOnboardingGate({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOnboarded();
  return <>{children}</>;
}

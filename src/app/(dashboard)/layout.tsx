import { getCurrentPhase } from "@/lib/system-phase";
import { DashboardLayoutClient } from "./layout-client";

/**
 * Server entry point for the dashboard layout. Reads CURRENT_PHASE from the
 * server-only environment variable (see src/lib/system-phase.ts and MVP.md
 * Section 2 — Phase transition mechanism) and forwards it to the client
 * wrapper. Client components in turn pass it through to CreditsProvider so
 * phase-aware UI doesn't need to read process.env (which would be undefined
 * in the browser bundle).
 *
 * Same pattern is used for FOUNDER_EMAILS via the isFounder helper — server
 * env var, surfaced to clients only via session/props.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentPhase = getCurrentPhase();

  return (
    <DashboardLayoutClient currentPhase={currentPhase}>
      {children}
    </DashboardLayoutClient>
  );
}

import { getCurrentPhase } from "@/lib/system-phase";
import { PricingClient } from "./pricing-client";

/**
 * Server entry for /pricing. Reads CURRENT_PHASE so the client can render the
 * closed-beta banner and swap "Coming Soon" CTAs for "Request beta access" in
 * phase_1. See MVP.md Section 12.5.
 *
 * Same server-wrapper pattern as the dashboard layout — keeps env-var reads
 * out of the client bundle.
 */
export default function PricingPage() {
  const currentPhase = getCurrentPhase();
  return <PricingClient currentPhase={currentPhase} />;
}

"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { SystemPhase } from "@/lib/system-phase";

interface CreditsContextType {
  credits: number;
  creditsTotal: number;
  creditsResetDate: string | null;
  sentimentCredits: number;
  sentimentTotal: number;
  sentimentResetDate: string | null;
  tier: string;
  // MVP Phase 1: surfaced so phase-aware UI components (OutOfCreditsDialog,
  // LowCreditWarning) can pick the right CTA without re-fetching per render.
  // isBetaUser comes from /api/dashboard/stats; currentPhase is set once at
  // provider mount from the build-time env var (server component reads
  // CURRENT_PHASE and passes it down via initialCurrentPhase).
  isBetaUser: boolean;
  currentPhase: SystemPhase;
  // Set during /onboarding. Pre-fills FounderInquiryForm.businessName for
  // signed-in users so they don't re-type information we already have. null
  // for users who haven't completed onboarding yet.
  organizationName: string | null;
  setCredits: (_credits: number) => void;
  refreshCredits: () => Promise<void>;
}

const CreditsContext = createContext<CreditsContextType | undefined>(undefined);

interface CreditsProviderProps {
  children: ReactNode;
  initialCredits?: number;
  initialCreditsTotal?: number;
  initialCreditsResetDate?: string | null;
  initialSentimentCredits?: number;
  initialSentimentTotal?: number;
  initialSentimentResetDate?: string | null;
  initialTier?: string;
  initialIsBetaUser?: boolean;
  initialOrganizationName?: string | null;
  // Defaults to "phase_1" — overridden by the dashboard layout (server
  // component) which reads CURRENT_PHASE on the server and passes it in.
  initialCurrentPhase?: SystemPhase;
}

export function CreditsProvider({
  children,
  initialCredits = 0,
  initialCreditsTotal = 15,
  initialCreditsResetDate = null,
  initialSentimentCredits = 0,
  initialSentimentTotal = 35,
  initialSentimentResetDate = null,
  initialTier = "FREE",
  initialIsBetaUser = false,
  initialOrganizationName = null,
  initialCurrentPhase = "phase_1",
}: CreditsProviderProps) {
  const [credits, setCreditsState] = useState(initialCredits);
  const [creditsTotal, setCreditsTotal] = useState(initialCreditsTotal);
  const [creditsResetDate, setCreditsResetDate] = useState<string | null>(initialCreditsResetDate);
  const [sentimentCredits, setSentimentCredits] = useState(initialSentimentCredits);
  const [sentimentTotal, setSentimentTotal] = useState(initialSentimentTotal);
  const [sentimentResetDate, setSentimentResetDate] = useState<string | null>(initialSentimentResetDate);
  const [tier, setTier] = useState(initialTier);
  const [isBetaUser, setIsBetaUser] = useState(initialIsBetaUser);
  const [organizationName, setOrganizationName] = useState<string | null>(
    initialOrganizationName,
  );
  // currentPhase is intentionally not mutable from inside the provider — it's
  // fixed at mount from the server's CURRENT_PHASE env var.
  const [currentPhase] = useState<SystemPhase>(initialCurrentPhase);

  const setCredits = useCallback((newCredits: number) => {
    setCreditsState(newCredits);
  }, []);

  const refreshCredits = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/stats");
      const data = await res.json();
      if (data.success) {
        setCreditsState(data.data.credits.remaining);
        setCreditsTotal(data.data.credits.total);
        setCreditsResetDate(data.data.credits.resetDate);
        setSentimentCredits(data.data.sentiment.remaining);
        setSentimentTotal(data.data.sentiment.total);
        setSentimentResetDate(data.data.sentiment.resetDate);
        setTier(data.data.tier);
        setIsBetaUser(data.data.isBetaUser ?? false);
        setOrganizationName(data.data.organizationName ?? null);
      }
    } catch (error) {
      console.error("Failed to refresh credits:", error);
    }
  }, []);

  return (
    <CreditsContext.Provider
      value={{
        credits,
        creditsTotal,
        creditsResetDate,
        sentimentCredits,
        sentimentTotal,
        sentimentResetDate,
        tier,
        isBetaUser,
        currentPhase,
        organizationName,
        setCredits,
        refreshCredits,
      }}
    >
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  const context = useContext(CreditsContext);
  if (context === undefined) {
    throw new Error("useCredits must be used within a CreditsProvider");
  }
  return context;
}

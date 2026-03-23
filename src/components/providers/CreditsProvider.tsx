"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface CreditsContextType {
  credits: number;
  creditsTotal: number;
  creditsResetDate: string | null;
  sentimentCredits: number;
  sentimentTotal: number;
  sentimentResetDate: string | null;
  tier: string;
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
}: CreditsProviderProps) {
  const [credits, setCreditsState] = useState(initialCredits);
  const [creditsTotal, setCreditsTotal] = useState(initialCreditsTotal);
  const [creditsResetDate, setCreditsResetDate] = useState<string | null>(initialCreditsResetDate);
  const [sentimentCredits, setSentimentCredits] = useState(initialSentimentCredits);
  const [sentimentTotal, setSentimentTotal] = useState(initialSentimentTotal);
  const [sentimentResetDate, setSentimentResetDate] = useState<string | null>(initialSentimentResetDate);
  const [tier, setTier] = useState(initialTier);

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
      }
    } catch (error) {
      console.error("Failed to refresh credits:", error);
    }
  }, []);

  return (
    <CreditsContext.Provider value={{ credits, creditsTotal, creditsResetDate, sentimentCredits, sentimentTotal, sentimentResetDate, tier, setCredits, refreshCredits }}>
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

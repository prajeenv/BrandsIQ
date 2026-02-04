"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Sidebar, DashboardHeader } from "@/components/dashboard";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { LoadingPage } from "@/components/shared";
import { CreditsProvider, useCredits } from "@/components/providers/CreditsProvider";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { credits, tier, refreshCredits } = useCredits();
  const [isInitialized, setIsInitialized] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Fetch dashboard data (credits, tier) on mount
  useEffect(() => {
    if (status === "authenticated" && !isInitialized) {
      refreshCredits().then(() => setIsInitialized(true));
    }
  }, [status, isInitialized, refreshCredits]);

  // Show loading while checking auth
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <LoadingPage message="Loading dashboard..." />
      </div>
    );
  }

  // Don't render if not authenticated
  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile sidebar (Sheet) */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <Sidebar
            isMobile
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main content area */}
      <div className="lg:pl-64">
        {/* Header */}
        <DashboardHeader
          onMenuClick={() => setIsMobileMenuOpen(true)}
          tier={tier}
        />

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CreditsProvider>
      <DashboardContent>{children}</DashboardContent>
    </CreditsProvider>
  );
}

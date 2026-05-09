"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  MessageSquare,
  Settings,
  Sparkles,
  Ticket,
  X,
} from "lucide-react";
import { isFounder } from "@/lib/auth-helpers";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Reviews",
    href: "/dashboard/reviews",
    icon: MessageSquare,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

// Founder-only admin links. Visibility gated by isFounder(session); the actual
// route is also gated by middleware + per-route checks. See MVP.md Section 13.
const adminNavigation = [
  {
    name: "Beta invites",
    href: "/dashboard/admin/beta-invites",
    icon: Ticket,
  },
];

export function Sidebar({ isOpen = true, onClose, isMobile = false }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const showAdmin = isFounder(session);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">BrandsIQ</span>
        </Link>
        {isMobile && onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
            <X className="h-5 w-5" />
            <span className="sr-only">Close sidebar</span>
          </Button>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-3">
          {navigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={isMobile ? onClose : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}

          {showAdmin && (
            <div className="pt-4 mt-4 border-t border-border">
              <p className="px-3 pb-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                Admin
              </p>
              {adminNavigation.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={isMobile ? onClose : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          )}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground text-center">
          BrandsIQ v1.0
        </p>
      </div>
    </>
  );

  // Mobile sidebar is controlled by Sheet in the layout
  if (isMobile) {
    return (
      <div className="flex h-full flex-col bg-background">
        {sidebarContent}
      </div>
    );
  }

  // Desktop sidebar
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r bg-background lg:flex",
        !isOpen && "lg:hidden"
      )}
    >
      {sidebarContent}
    </aside>
  );
}

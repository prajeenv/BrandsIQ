"use client";

import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, User, CreditCard, Bell, ChevronRight, History } from "lucide-react";

const settingsSections = [
  {
    title: "Brand Voice",
    description: "Configure how AI generates responses to match your brand's unique voice and style.",
    href: "/dashboard/settings/brand-voice",
    icon: MessageSquare,
    available: true,
  },
  {
    title: "Credit History",
    description: "View your response and sentiment credit usage history.",
    href: "/dashboard/settings/usage",
    icon: History,
    available: true,
  },
  {
    title: "Profile",
    description: "Manage your personal information and account details.",
    href: "/dashboard/settings/profile",
    icon: User,
    available: false,
    comingSoon: true,
  },
  {
    title: "Billing & Subscription",
    description: "Upgrade your plan and manage billing.",
    href: "/pricing",
    icon: CreditCard,
    available: true,
  },
  {
    title: "Notifications",
    description: "Configure email notifications and alerts.",
    href: "/dashboard/settings/notifications",
    icon: Bell,
    available: false,
    comingSoon: true,
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="grid gap-4">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card
              key={section.href}
              className={section.available ? "hover:bg-accent/50 transition-colors" : "opacity-60"}
            >
              {section.available ? (
                <Link href={section.href}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{section.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {section.description}
                        </CardDescription>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardHeader>
                </Link>
              ) : (
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-muted p-2">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {section.title}
                        {section.comingSoon && (
                          <span className="text-xs font-normal bg-muted text-muted-foreground px-2 py-0.5 rounded">
                            Coming Soon
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {section.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

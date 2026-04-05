"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Check, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TIER_LIMITS, SUBSCRIPTION_TIERS } from "@/lib/constants";
import type { SubscriptionTier } from "@/lib/constants";

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  tier: SubscriptionTier;
  name: string;
  description: string;
  price: number;
  credits: number;
  sentimentQuota: number;
  features: PlanFeature[];
  popular?: boolean;
}

const plans: Plan[] = [
  {
    tier: "FREE",
    name: "Free",
    description: "Perfect for trying out BrandsIQ",
    price: 0,
    credits: TIER_LIMITS.FREE.credits,
    sentimentQuota: TIER_LIMITS.FREE.sentimentQuota,
    features: [
      { text: `${TIER_LIMITS.FREE.credits} AI responses per month`, included: true },
      { text: `${TIER_LIMITS.FREE.sentimentQuota} sentiment analyses per month`, included: true },
      { text: "Basic brand voice customization", included: true },
      { text: "Multi-language support (40+ languages)", included: true },
      { text: "Email support", included: false },
      { text: "Priority response generation", included: false },
    ],
  },
  {
    tier: "STARTER",
    name: "Starter",
    description: "For small businesses getting started",
    price: TIER_LIMITS.STARTER.price,
    credits: TIER_LIMITS.STARTER.credits,
    sentimentQuota: TIER_LIMITS.STARTER.sentimentQuota,
    popular: true,
    features: [
      { text: `${TIER_LIMITS.STARTER.credits} AI responses per month`, included: true },
      { text: `${TIER_LIMITS.STARTER.sentimentQuota} sentiment analyses per month`, included: true },
      { text: "Advanced brand voice customization", included: true },
      { text: "Multi-language support (40+ languages)", included: true },
      { text: "Email support", included: true },
      { text: "Priority response generation", included: false },
    ],
  },
  {
    tier: "GROWTH",
    name: "Growth",
    description: "For growing businesses with high volume",
    price: TIER_LIMITS.GROWTH.price,
    credits: TIER_LIMITS.GROWTH.credits,
    sentimentQuota: TIER_LIMITS.GROWTH.sentimentQuota,
    features: [
      { text: `${TIER_LIMITS.GROWTH.credits} AI responses per month`, included: true },
      { text: `${TIER_LIMITS.GROWTH.sentimentQuota} sentiment analyses per month`, included: true },
      { text: "Advanced brand voice customization", included: true },
      { text: "Multi-language support (40+ languages)", included: true },
      { text: "Priority email support", included: true },
      { text: "Priority response generation", included: true },
    ],
  },
];

export default function PricingPage() {
  const { data: session } = useSession();
  const userTier = (session?.user as { tier?: string })?.tier || "FREE";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <div className="container max-w-6xl py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link href={session ? "/dashboard" : "/"}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pricing Plans</h1>
            <p className="text-muted-foreground">
              Choose the perfect plan for your business needs
            </p>
          </div>
        </div>

        {/* Plans grid */}
        <div className="grid gap-6 md:grid-cols-3 mb-12">
          {plans.map((plan) => {
            const isCurrentPlan = userTier === plan.tier;
            const isUpgrade =
              SUBSCRIPTION_TIERS.indexOf(plan.tier) > SUBSCRIPTION_TIERS.indexOf(userTier as SubscriptionTier);

            return (
              <Card
                key={plan.tier}
                className={`relative flex flex-col ${
                  plan.popular ? "border-primary shadow-lg scale-105" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      <Sparkles className="mr-1 h-3 w-3" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    {isCurrentPlan && (
                      <Badge variant="secondary">Current Plan</Badge>
                    )}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <div className="mb-6">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="rounded-full bg-primary/10 p-1">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <span>
                        <strong>{plan.credits}</strong> AI response credits
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="rounded-full bg-primary/10 p-1">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <span>
                        <strong>{plan.sentimentQuota}</strong> sentiment analyses
                      </span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-3">Features:</p>
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li
                          key={index}
                          className={`flex items-start gap-2 text-sm ${
                            !feature.included ? "text-muted-foreground" : ""
                          }`}
                        >
                          <Check
                            className={`h-4 w-4 mt-0.5 shrink-0 ${
                              feature.included ? "text-green-500" : "text-muted-foreground/40"
                            }`}
                          />
                          <span className={!feature.included ? "line-through" : ""}>
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>

                <CardFooter>
                  {isCurrentPlan ? (
                    <Button className="w-full" variant="secondary" disabled>
                      Current Plan
                    </Button>
                  ) : isUpgrade ? (
                    <Button className="w-full" disabled>
                      Upgrade - Coming Soon
                    </Button>
                  ) : (
                    <Button className="w-full" variant="outline" disabled>
                      Downgrade - Coming Soon
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">What are credits?</h3>
              <p className="text-muted-foreground text-sm">
                Credits are used to generate AI responses. Each response generation costs 1 credit,
                whether it&apos;s a new response or a regeneration with a different tone.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What is sentiment analysis quota?</h3>
              <p className="text-muted-foreground text-sm">
                Sentiment analysis is automatically performed when you add a new review to determine
                if it&apos;s positive, neutral, or negative. Each analysis uses one quota.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">When do credits reset?</h3>
              <p className="text-muted-foreground text-sm">
                Credits and sentiment quotas reset every 30 days from your signup date (anniversary billing).
                For example, if you signed up on January 15th, your credits will reset on February 14th,
                March 16th, and so on. Unused credits do not roll over.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Can I upgrade anytime?</h3>
              <p className="text-muted-foreground text-sm">
                Yes! When you upgrade, you&apos;ll immediately receive the full credits for your new plan.
                Your 30-day billing cycle continues from your original signup date.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What languages are supported?</h3>
              <p className="text-muted-foreground text-sm">
                BrandsIQ supports 40+ languages including English, Spanish, French, German,
                Japanese, Chinese, Arabic, and many more. Responses are generated natively in
                the detected language.
              </p>
            </div>
          </div>
        </div>

        {/* Contact section */}
        <div className="text-center mt-12 py-8 border-t">
          <p className="text-muted-foreground mb-4">
            Need a custom plan for your enterprise? Contact us for volume pricing.
          </p>
          <Button variant="outline" disabled>
            Contact Sales - Coming Soon
          </Button>
        </div>
      </div>
    </div>
  );
}

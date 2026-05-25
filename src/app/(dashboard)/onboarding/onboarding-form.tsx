"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sparkles,
  Building2,
  Briefcase,
  Globe,
  MapPin,
  Loader2,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  INDUSTRIES,
  BUSINESS_TYPES_BY_INDUSTRY,
  COUNTRIES,
  PLATFORMS,
  VALIDATION_LIMITS,
  type Industry,
  type BusinessType,
} from "@/lib/constants";
import { onboardingSubmitSchema, type OnboardingSubmitInput } from "@/lib/validations";
import { useCredits } from "@/components/providers/CreditsProvider";
import { trackOnboardingCompleted } from "@/lib/posthog-events";

/**
 * Onboarding form (client component). Server gate lives in the parent
 * page; this component only renders + submits.
 *
 * Required: organizationName, industry, businessType, country, locationName
 * Optional: locationCountEstimate, primaryPlatform
 * Conditional (non-beta users only): signupIntent + signupChallengeText.
 *
 * After a successful submit we hard-navigate to /dashboard. The dashboard
 * layout's server-component guard re-reads organizationName from the DB
 * on the next request, sees it's populated, and renders the dashboard.
 * No JWT-staleness machinery to fight.
 */
export function OnboardingForm() {
  const { isBetaUser, refreshCredits } = useCredits();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OnboardingSubmitInput>({
    resolver: zodResolver(onboardingSubmitSchema),
  });

  const industry = watch("industry");
  const businessType = watch("businessType");
  const country = watch("country");
  const primaryPlatform = watch("primaryPlatform");
  const signupIntent = watch("signupIntent");

  // Cascade: businessType options depend on industry. When industry changes
  // we clear the previously-selected businessType so it can't be stale.
  const businessTypeOptions =
    industry && industry !== "Other"
      ? BUSINESS_TYPES_BY_INDUSTRY[industry as Industry]
      : [];

  // Industry "Other" has no cascade — hide the second dropdown entirely.
  const showBusinessType = Boolean(industry) && industry !== "Other";

  const onSubmit = async (data: OnboardingSubmitInput) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: data.organizationName.trim(),
          industry: data.industry,
          // businessType is null when industry is "Other" (no cascade).
          businessType: data.businessType ?? null,
          country: data.country,
          locationName: data.locationName.trim(),
          locationCountEstimate: data.locationCountEstimate ?? null,
          primaryPlatform: data.primaryPlatform ?? null,
          signupIntent: data.signupIntent ?? null,
          signupChallengeText: data.signupChallengeText?.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message ?? "Failed to save your profile. Please try again.");
        return;
      }

      // PostHog: onboarding completion event. Captures the categorical
      // signals we'll group by in PostHog dashboards. businessType is null
      // when industry is "Other" (no cascade). Fires before navigation so
      // we don't race against the page unload.
      trackOnboardingCompleted({
        industry: data.industry ?? null,
        businessType: data.businessType ?? null,
        country: data.country ?? null,
      });

      // Refresh CreditsProvider state so the newly-saved organizationName
      // is in memory before the user reaches /dashboard. Without this, the
      // FounderInquiryForm pre-fill in OutOfCreditsDialog stays null until
      // page refresh. See PR #94 for the precedent.
      try {
        await refreshCredits();
      } catch {
        // Non-fatal — value will refresh on next dashboard load anyway.
      }

      // Hard navigation. The dashboard layout's server-component guard
      // re-reads organizationName from DB on the next request and lets
      // the user through. We deliberately do NOT call useSession().update()
      // — earlier attempts to refresh a JWT-based flag (hasOnboarded) hit
      // staleness because of session.updateAge, requiring a sign-out/in
      // cycle to take effect. The server-component approach reads fresh
      // every server render.
      window.location.href = "/dashboard";
    } catch {
      setError("Failed to save your profile. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container max-w-2xl py-12">
      <Card>
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to BrandsIQ</CardTitle>
          <CardDescription>
            Let&apos;s set up your account so we can tailor responses to your business.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* About your business */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                About your business
              </h3>

              <div className="space-y-1.5">
                <Label htmlFor="organizationName">Organization name *</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="organizationName"
                    placeholder="e.g. The Bear Bakery"
                    className="pl-10"
                    maxLength={VALIDATION_LIMITS.ORGANIZATION_NAME_MAX}
                    disabled={isSubmitting}
                    {...register("organizationName")}
                  />
                </div>
                {errors.organizationName && (
                  <p className="text-xs text-red-600">{errors.organizationName.message}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="industry">Industry *</Label>
                  <Select
                    value={industry ?? ""}
                    onValueChange={(value) => {
                      setValue("industry", value as OnboardingSubmitInput["industry"], {
                        shouldValidate: true,
                      });
                      // Reset the cascade — clear businessType so a stale
                      // value (e.g. Pharmacy chosen under Retail) can't
                      // survive a switch to a different industry.
                      setValue("businessType", null, { shouldValidate: true });
                    }}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="industry">
                      <div className="flex items-center gap-2 w-full">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Select industry" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.industry && (
                    <p className="text-xs text-red-600">{errors.industry.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="country">Country *</Label>
                  <Select
                    value={country ?? ""}
                    onValueChange={(value) =>
                      setValue("country", value as OnboardingSubmitInput["country"], {
                        shouldValidate: true,
                      })
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="country">
                      <div className="flex items-center gap-2 w-full">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Select country" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.country && (
                    <p className="text-xs text-red-600">{errors.country.message}</p>
                  )}
                </div>
              </div>

              {/* Business type — second-level cascade. Hidden when industry
                  is "Other" (no list to show) or unset. */}
              {showBusinessType && (
                <div className="space-y-1.5">
                  <Label htmlFor="businessType">Business type *</Label>
                  <Select
                    value={businessType ?? ""}
                    onValueChange={(value) =>
                      setValue("businessType", value as BusinessType, {
                        shouldValidate: true,
                      })
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="businessType">
                      <div className="flex items-center gap-2 w-full">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Select business type" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {businessTypeOptions.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.businessType && (
                    <p className="text-xs text-red-600">{errors.businessType.message}</p>
                  )}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="locationCountEstimate">
                    Number of locations
                    <span className="text-muted-foreground ml-1 text-xs font-normal">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="locationCountEstimate"
                    type="number"
                    min={1}
                    max={VALIDATION_LIMITS.LOCATION_COUNT_MAX}
                    placeholder="e.g. 1"
                    disabled={isSubmitting}
                    {...register("locationCountEstimate", {
                      setValueAs: (v) => (v === "" || v == null ? null : Number(v)),
                    })}
                  />
                  {errors.locationCountEstimate && (
                    <p className="text-xs text-red-600">
                      {errors.locationCountEstimate.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="primaryPlatform">
                    Primary review platform
                    <span className="text-muted-foreground ml-1 text-xs font-normal">
                      (optional)
                    </span>
                  </Label>
                  <Select
                    value={primaryPlatform ?? ""}
                    onValueChange={(value) =>
                      setValue("primaryPlatform", value as OnboardingSubmitInput["primaryPlatform"], {
                        shouldValidate: true,
                      })
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="primaryPlatform">
                      <SelectValue placeholder="Where most reviews come from" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* Your first location */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Your first location
              </h3>

              <div className="space-y-1.5">
                <Label htmlFor="locationName">Location name *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="locationName"
                    placeholder="e.g. The Bear Bakery, Shoreditch"
                    className="pl-10"
                    maxLength={VALIDATION_LIMITS.LOCATION_NAME_MAX}
                    disabled={isSubmitting}
                    {...register("locationName")}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  A short label so you can identify this location in your dashboard. Not a postal address.
                </p>
                {errors.locationName && (
                  <p className="text-xs text-red-600">{errors.locationName.message}</p>
                )}
              </div>
            </section>

            {/* Beta intent — only for non-beta users (signed up via direct
                signup, not via invite link). Per MVP.md Section 9. */}
            {!isBetaUser && (
              <section className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Tell us more
                  <span className="ml-2 text-xs font-normal normal-case text-muted-foreground">
                    (optional)
                  </span>
                </h3>

                <div className="space-y-2">
                  <Label>Are you exploring BrandsIQ for beta access?</Label>
                  <RadioGroup
                    value={signupIntent ?? ""}
                    onValueChange={(value) =>
                      setValue("signupIntent", value as OnboardingSubmitInput["signupIntent"], {
                        shouldValidate: false,
                      })
                    }
                    disabled={isSubmitting}
                    className="flex flex-col gap-2 sm:flex-row sm:gap-6"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="yes" id="intent-yes" />
                      <Label htmlFor="intent-yes" className="font-normal cursor-pointer">
                        Yes
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="just_trying" id="intent-trying" />
                      <Label htmlFor="intent-trying" className="font-normal cursor-pointer">
                        Just trying it out
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="unsure" id="intent-unsure" />
                      <Label htmlFor="intent-unsure" className="font-normal cursor-pointer">
                        Unsure
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Unified with FounderInquiryForm (beta_request) — same label,
                    hint and example placeholder so the founder reads
                    consistently-shaped submissions regardless of source. The
                    dynamic helper line below stays onboarding-specific: it
                    tells the user that submitting here is equivalent to
                    requesting beta access. */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="signupChallengeText"
                    className="flex flex-wrap items-baseline gap-x-1.5"
                  >
                    <span>Tell us about your business</span>
                    <span className="text-xs italic text-muted-foreground font-normal">
                      (what you do, what&apos;s painful about reviews today)
                    </span>
                  </Label>
                  <Textarea
                    id="signupChallengeText"
                    placeholder='e.g. "I run a small bakery in Shoreditch. Responding to Google reviews takes me ~30 min a day and I usually copy-paste the same few replies."'
                    rows={3}
                    maxLength={VALIDATION_LIMITS.SIGNUP_CHALLENGE_TEXT_MAX}
                    disabled={isSubmitting}
                    {...register("signupChallengeText")}
                  />
                  <p className="text-xs text-muted-foreground">
                    {signupIntent === "yes" || (watch("signupChallengeText")?.trim().length ?? 0) > 0
                      ? "Submitting this will request beta access. The founder will reach out within 24 hours."
                      : "Optional. Helps us understand who's signing up."}
                  </p>
                </div>
              </section>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Continue to dashboard →"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
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
  COUNTRIES,
  PLATFORMS,
  VALIDATION_LIMITS,
} from "@/lib/constants";
import { onboardingSubmitSchema, type OnboardingSubmitInput } from "@/lib/validations";
import { useCredits } from "@/components/providers/CreditsProvider";

/**
 * /onboarding — single-page wizard collecting profile fields per MVP.md
 * Section 9. Replaces the iteration-1 placeholder.
 *
 * Required: organizationName, industry, country, locationName
 * Optional: locationCountEstimate, primaryPlatform
 * Conditional (only for non-beta users):
 *   - signupIntent radio + signupChallengeText textarea. If either is set, the
 *     API creates a FounderInquiry of type=beta_request automatically — see
 *     src/app/api/user/profile/route.ts and MVP.md Section 9.
 *
 * Visually grouped into sections rather than multi-step. Field count is small
 * enough (max 7 visible) that one screen is less friction than a wizard.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const { update: updateSession } = useSession();
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
  const country = watch("country");
  const primaryPlatform = watch("primaryPlatform");
  const signupIntent = watch("signupIntent");

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

      // Refresh the JWT-backed session so the new organizationName is in
      // session.user.* if downstream UI needs it. Best-effort.
      try {
        await updateSession?.();
      } catch {
        // Non-fatal
      }

      // Refresh CreditsProvider state so the newly-saved organizationName
      // (and any other onboarding fields it surfaces) is in memory before
      // the user reaches /dashboard. Without this, the in-memory state
      // stays at the value baked in when the dashboard layout first
      // mounted (typically null for a fresh signup), and downstream
      // surfaces — most notably FounderInquiryForm in the OutOfCreditsDialog
      // — pre-fill businessName as null until the user signs out and back
      // in. See iteration 2 follow-up.
      try {
        await refreshCredits();
      } catch {
        // Non-fatal — value will refresh on next dashboard load anyway.
      }

      router.push("/dashboard");
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
                    onValueChange={(value) =>
                      setValue("industry", value as OnboardingSubmitInput["industry"], {
                        shouldValidate: true,
                      })
                    }
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
                    placeholder="e.g. The Bear Bakery — Shoreditch"
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

                <div className="space-y-1.5">
                  <Label htmlFor="signupChallengeText">
                    Tell us about your review management challenge
                  </Label>
                  <Textarea
                    id="signupChallengeText"
                    placeholder="What got you here? (e.g., responding to 50+ reviews/month manually, want consistent voice across locations…)"
                    rows={3}
                    maxLength={VALIDATION_LIMITS.SIGNUP_CHALLENGE_TEXT_MAX}
                    disabled={isSubmitting}
                    {...register("signupChallengeText")}
                  />
                  <p className="text-xs text-muted-foreground">
                    {signupIntent === "yes" || (watch("signupChallengeText")?.trim().length ?? 0) > 0
                      ? "Submitting this will request beta access — the founder will reach out within 24 hours."
                      : "Optional — helps us understand who's signing up."}
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

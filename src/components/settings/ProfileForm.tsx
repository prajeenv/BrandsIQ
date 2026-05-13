"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  Briefcase,
  Globe,
  MapPin,
  User as UserIcon,
  Mail,
  KeyRound,
  Loader2,
  Cloud,
  CloudOff,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  INDUSTRIES,
  BUSINESS_TYPES_BY_INDUSTRY,
  COUNTRIES,
  PLATFORMS,
  VALIDATION_LIMITS,
  TIER_LIMITS,
  type Industry,
  type BusinessType,
  type Country,
  type Platform,
} from "@/lib/constants";
import { useCredits } from "@/components/providers/CreditsProvider";

interface ProfileData {
  id: string;
  email: string;
  name: string | null;
  organizationName: string | null;
  industry: string | null;
  businessType: string | null;
  country: string | null;
  locationCountEstimate: number | null;
  primaryPlatform: string | null;
  isBetaUser: boolean;
  tier: string;
}

interface LocationData {
  id: string;
  name: string;
}

// Auto-save debounce. Matches BrandVoiceForm for UX consistency.
const AUTO_SAVE_DELAY = 1500;

type SaveStatus = "saved" | "saving" | "unsaved";

export function ProfileForm() {
  const { update: updateSession } = useSession();
  const { refreshCredits } = useCredits();

  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [hasPassword, setHasPassword] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [industry, setIndustry] = useState<string>("");
  const [businessType, setBusinessType] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [locationName, setLocationName] = useState("");
  const [locationCountEstimate, setLocationCountEstimate] = useState<string>("");
  const [primaryPlatform, setPrimaryPlatform] = useState<string>("");

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/user/settings/profile");
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to fetch profile");
      }

      const p: ProfileData = data.data.profile;
      const loc: LocationData | null = data.data.location;
      setProfile(p);
      setLocation(loc);
      setHasPassword(Boolean(data.data.hasPassword));

      setName(p.name ?? "");
      setOrganizationName(p.organizationName ?? "");
      setIndustry(p.industry ?? "");
      setBusinessType(p.businessType ?? "");
      setCountry(p.country ?? "");
      setLocationName(loc?.name ?? "");
      setLocationCountEstimate(
        p.locationCountEstimate != null ? String(p.locationCountEstimate) : "",
      );
      setPrimaryPlatform(p.primaryPlatform ?? "");

      // Delay enabling autosave so the initial fetch doesn't immediately
      // trigger a save round-trip. Same pattern as BrandVoiceForm.
      setTimeout(() => setIsInitialized(true), 100);
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile settings");
    } finally {
      setIsLoading(false);
    }
  };

  // Build the partial-update payload from currently-changed fields. Only
  // includes a field if it differs from the saved value AND is non-empty for
  // the conceptually-required fields (name, org, industry, country, location).
  const buildChangedPayload = useCallback(() => {
    if (!profile) return null;
    const payload: Record<string, unknown> = {};

    const trimmedName = name.trim();
    if (trimmedName && trimmedName !== (profile.name ?? "")) {
      payload.name = trimmedName;
    }

    const trimmedOrg = organizationName.trim();
    if (trimmedOrg && trimmedOrg !== (profile.organizationName ?? "")) {
      payload.organizationName = trimmedOrg;
    }

    // Industry + businessType travel as a cascade pair. If industry changed
    // we must also clear/refresh businessType in the same payload so the
    // server-side cross-field check sees a consistent pair. If only
    // businessType changed (industry untouched), we send businessType alone.
    const industryChanged = industry && industry !== (profile.industry ?? "");
    const businessTypeChanged = businessType !== (profile.businessType ?? "");
    if (industryChanged) {
      payload.industry = industry;
      // industry == "Other" => no cascade => businessType must be null.
      // Otherwise send whatever the user has currently picked (may be empty
      // string if they haven't picked yet; we coerce that to null so the
      // server treats it as cleared, which is correct mid-edit).
      payload.businessType =
        industry === "Other" || businessType === "" ? null : businessType;
    } else if (businessTypeChanged) {
      // Industry stayed the same; only businessType moved.
      payload.businessType = businessType === "" ? null : businessType;
    }

    if (country && country !== (profile.country ?? "")) {
      payload.country = country;
    }

    const trimmedLocation = locationName.trim();
    if (trimmedLocation && trimmedLocation !== (location?.name ?? "")) {
      payload.locationName = trimmedLocation;
    }

    // Optional fields use null to clear. Empty input string clears the value.
    if (locationCountEstimate.trim() === "") {
      if (profile.locationCountEstimate != null) {
        payload.locationCountEstimate = null;
      }
    } else {
      const parsed = Number(locationCountEstimate);
      if (
        Number.isFinite(parsed) &&
        Number.isInteger(parsed) &&
        parsed >= 1 &&
        parsed <= VALIDATION_LIMITS.LOCATION_COUNT_MAX &&
        parsed !== profile.locationCountEstimate
      ) {
        payload.locationCountEstimate = parsed;
      }
    }

    if (primaryPlatform === "") {
      if (profile.primaryPlatform != null) {
        payload.primaryPlatform = null;
      }
    } else if (primaryPlatform !== (profile.primaryPlatform ?? "")) {
      payload.primaryPlatform = primaryPlatform;
    }

    return payload;
  }, [
    profile,
    location,
    name,
    organizationName,
    industry,
    businessType,
    country,
    locationName,
    locationCountEstimate,
    primaryPlatform,
  ]);

  const performSave = useCallback(async () => {
    const payload = buildChangedPayload();
    if (!payload || Object.keys(payload).length === 0) {
      setSaveStatus("saved");
      return;
    }

    setSaveStatus("saving");

    try {
      const res = await fetch("/api/user/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to save profile");
      }

      setProfile(data.data.profile);
      if (data.data.location) setLocation(data.data.location);
      setSaveStatus("saved");

      // Push the changes downstream so the dashboard reflects them without
      // a reload:
      //  - session.user.name powers the welcome header; refresh JWT if name
      //    changed.
      //  - CreditsProvider holds organizationName + drives FounderInquiryForm
      //    pre-fill; refresh so the new value is visible everywhere.
      if (payload.name !== undefined) {
        try {
          await updateSession?.();
        } catch {
          // Non-fatal
        }
      }
      if (
        payload.organizationName !== undefined ||
        payload.name !== undefined
      ) {
        try {
          await refreshCredits();
        } catch {
          // Non-fatal
        }
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      setSaveStatus("unsaved");
      toast.error(error instanceof Error ? error.message : "Failed to save");
    }
  }, [buildChangedPayload, refreshCredits, updateSession]);

  // Autosave effect — same shape as BrandVoiceForm.
  useEffect(() => {
    if (!isInitialized || !profile) return;

    const payload = buildChangedPayload();
    const hasChanges = payload && Object.keys(payload).length > 0;

    if (!hasChanges) {
      setSaveStatus("saved");
      return;
    }

    setSaveStatus("unsaved");

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      performSave();
    }, AUTO_SAVE_DELAY);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [isInitialized, profile, buildChangedPayload, performSave]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Render the tier / beta status as a friendly label.
  const planLabel = profile?.isBetaUser
    ? "Closed beta"
    : profile?.tier
      ? `${profile.tier[0]}${profile.tier.slice(1).toLowerCase()}` // FREE → Free
      : "Free";

  const planSubtext = profile?.isBetaUser
    ? "150 response credits / 750 sentiment per month"
    : profile?.tier === "STARTER"
      ? `${TIER_LIMITS.STARTER.credits} response credits / ${TIER_LIMITS.STARTER.sentimentQuota} sentiment per month`
      : profile?.tier === "GROWTH"
        ? `${TIER_LIMITS.GROWTH.credits} response credits / ${TIER_LIMITS.GROWTH.sentimentQuota} sentiment per month`
        : `${TIER_LIMITS.FREE.credits} response credits / ${TIER_LIMITS.FREE.sentimentQuota} sentiment per month`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Your account details. Changes are saved automatically.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-sm" data-testid="save-status">
              {saveStatus === "saving" && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-muted-foreground">Saving...</span>
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <Cloud className="h-4 w-4 text-green-500" />
                  <span className="text-green-500">Saved</span>
                </>
              )}
              {saveStatus === "unsaved" && (
                <>
                  <CloudOff className="h-4 w-4 text-yellow-500" />
                  <span className="text-yellow-500">Unsaved</span>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Account section — display name + read-only email + password link */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Account
            </h3>

            <div className="space-y-1.5">
              <Label htmlFor="name">Display name</Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  placeholder="Your name"
                  className="pl-10"
                  maxLength={VALIDATION_LIMITS.NAME_MAX}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Shown in the dashboard header (&quot;Welcome back, &lt;name&gt;&quot;) and on
                emails we send you.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  className="pl-10 bg-muted/40"
                  value={profile?.email ?? ""}
                  disabled
                  readOnly
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Contact support to change your email.
              </p>
            </div>

            {hasPassword && (
              <div className="space-y-1.5">
                <Label>Password</Label>
                <div>
                  <Link
                    href="/auth/forgot-password"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <KeyRound className="h-4 w-4" />
                    Change password
                  </Link>
                </div>
                <p className="text-xs text-muted-foreground">
                  We&apos;ll email you a reset link.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Plan</Label>
              <div className="text-sm">
                <span className="font-medium">{planLabel}</span>
                <span className="text-muted-foreground"> — {planSubtext}</span>
              </div>
            </div>
          </section>

          <Separator />

          {/* Business section — onboarding fields */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              About your business
            </h3>

            <div className="space-y-1.5">
              <Label htmlFor="organizationName">Organization name</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="organizationName"
                  placeholder="e.g. The Bear Bakery"
                  className="pl-10"
                  maxLength={VALIDATION_LIMITS.ORGANIZATION_NAME_MAX}
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="industry">Industry</Label>
                <Select
                  value={industry}
                  onValueChange={(value) => {
                    setIndustry(value as Industry);
                    // Reset the cascade locally so the second dropdown
                    // doesn't surface a stale value (e.g. "Pharmacy" still
                    // selected after switching from Retail to Hospitality).
                    // buildChangedPayload couples the two so the PATCH body
                    // stays internally consistent.
                    setBusinessType("");
                  }}
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
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="country">Country</Label>
                <Select
                  value={country}
                  onValueChange={(value) => setCountry(value as Country)}
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
              </div>
            </div>

            {/* Business type — second-level cascade. Hidden when industry
                is "Other" (no list to show) or unset. */}
            {industry && industry !== "Other" && (
              <div className="space-y-1.5">
                <Label htmlFor="businessType">Business type</Label>
                <Select
                  value={businessType}
                  onValueChange={(value) => setBusinessType(value as BusinessType)}
                >
                  <SelectTrigger id="businessType">
                    <div className="flex items-center gap-2 w-full">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Select business type" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {(BUSINESS_TYPES_BY_INDUSTRY[industry as Industry] ?? []).map(
                      (value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </section>

          <Separator />

          {/* Location section */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Your location
            </h3>

            <div className="space-y-1.5">
              <Label htmlFor="locationName">Location name</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="locationName"
                  placeholder='e.g. "The Bear Bakery — Shoreditch"'
                  className="pl-10"
                  maxLength={VALIDATION_LIMITS.LOCATION_NAME_MAX}
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                A short label to identify this location. Not a postal address.
              </p>
            </div>
          </section>

          <Separator />

          {/* Optional / informational */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Tell us more (optional)
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="locationCountEstimate">Total locations you operate</Label>
                <Input
                  id="locationCountEstimate"
                  type="number"
                  min={1}
                  max={VALIDATION_LIMITS.LOCATION_COUNT_MAX}
                  placeholder="e.g. 3"
                  value={locationCountEstimate}
                  onChange={(e) => setLocationCountEstimate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="primaryPlatform">Primary review platform</Label>
                <Select
                  value={primaryPlatform || "__none__"}
                  onValueChange={(value) =>
                    setPrimaryPlatform(value === "__none__" ? "" : (value as Platform))
                  }
                >
                  <SelectTrigger id="primaryPlatform">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
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
        </CardContent>
      </Card>
    </div>
  );
}

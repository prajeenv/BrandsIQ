"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Loader2, Mail, Lock, User, Eye, EyeOff, Check, X, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpSchema, type SignUpInput } from "@/lib/validations";
import {
  trackSignupCompletedWithBeta,
  trackSignupCompletedNoBeta,
  trackBetaInviteLinkUsed,
} from "@/lib/posthog-events";

interface SignupFormProps {
  callbackUrl?: string;
}

type InviteState =
  | { status: "none" }
  | { status: "checking"; code: string }
  | { status: "valid"; code: string }
  | { status: "invalid"; code: string };

function PasswordStrengthIndicator({ password }: { password: string }) {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
  };

  const strength = Object.values(checks).filter(Boolean).length;

  const getStrengthColor = () => {
    if (strength <= 1) return "bg-red-500";
    if (strength === 2) return "bg-orange-500";
    if (strength === 3) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStrengthText = () => {
    if (strength <= 1) return "Weak";
    if (strength === 2) return "Fair";
    if (strength === 3) return "Good";
    return "Strong";
  };

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded-full transition-colors ${
              level <= strength ? getStrengthColor() : "bg-muted"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Password strength: <span className="font-medium">{getStrengthText()}</span>
      </p>
      <ul className="text-xs space-y-1">
        {Object.entries({
          length: "At least 8 characters",
          uppercase: "One uppercase letter",
          lowercase: "One lowercase letter",
          number: "One number",
        }).map(([key, label]) => (
          <li
            key={key}
            className={`flex items-center gap-1 ${
              checks[key as keyof typeof checks]
                ? "text-green-600"
                : "text-muted-foreground"
            }`}
          >
            {checks[key as keyof typeof checks] ? (
              <Check className="h-3 w-3" />
            ) : (
              <X className="h-3 w-3" />
            )}
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SignupForm({ callbackUrl = "/dashboard" }: SignupFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Channel attribution: ?utm_source=<channel> (e.g. "walkin" from the Berlin
  // walk-in QR landing page). Stamped onto the signup-completed PostHog event
  // so we can answer "did this channel convert?" without any pre-consent page
  // analytics. Categorical, not PII.
  const signupSource = searchParams.get("utm_source") ?? undefined;

  // Invite-code handling: read ?b=<code>, validate via the public endpoint,
  // and route to /auth/beta-link-expired if the code is invalid.
  const inviteCode = searchParams.get("b");
  const [invite, setInvite] = useState<InviteState>(
    inviteCode ? { status: "checking", code: inviteCode } : { status: "none" }
  );

  useEffect(() => {
    if (!inviteCode) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/beta-invites/${encodeURIComponent(inviteCode)}/validate`
        );
        const json = await res.json();
        if (cancelled) return;
        if (json?.data?.valid) {
          setInvite({ status: "valid", code: inviteCode });
        } else {
          // Send the user to the recovery page rather than letting them submit
          // a doomed signup. Defensive — the signup route also re-validates.
          router.replace(`/auth/beta-link-expired?code=${encodeURIComponent(inviteCode)}`);
        }
      } catch {
        if (cancelled) return;
        setInvite({ status: "invalid", code: inviteCode });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [inviteCode, router]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
  });

  const password = watch("password", "");

  const onSubmit = async (data: SignUpInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const body =
        invite.status === "valid"
          ? { ...data, betaCode: invite.code }
          : data;

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        // If the server now reports the invite as invalid (e.g. used by a
        // concurrent signup between our pre-check and submit), bounce to
        // recovery instead of showing a generic error.
        if (result?.error?.code === "INVALID_BETA_CODE" && invite.status === "valid") {
          router.replace(`/auth/beta-link-expired?code=${encodeURIComponent(invite.code)}`);
          return;
        }
        setError(result.error?.message || "Failed to create account");
        return;
      }

      // PostHog: signup-funnel events. The server-returned isBetaUser is
      // the source of truth — if the user-supplied betaCode failed
      // server-side validation (despite the client pre-check passing), the
      // signup still succeeds as a Free user and we want to record the
      // _actual_ outcome.
      const userIsBetaUser = Boolean(result?.data?.user?.isBetaUser);
      if (userIsBetaUser) {
        trackSignupCompletedWithBeta({ signupSource });
        trackBetaInviteLinkUsed();
      } else {
        trackSignupCompletedNoBeta({ signupSource });
      }

      setSuccess(true);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);

    try {
      // If we have a validated invite, stash it server-side as an HttpOnly
      // cookie so NextAuth events.signIn can pick it up after the OAuth
      // round-trip (URL params don't survive the redirect to Google).
      if (invite.status === "valid") {
        try {
          await fetch("/api/auth/stash-invite", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: invite.code }),
          });
        } catch {
          // Non-fatal — user can still complete OAuth, they'll just land
          // as a Free user instead of a beta user. Surfaced via PostHog
          // metrics rather than blocking signup.
        }
      }
      await signIn("google", { callbackUrl });
    } catch {
      setError("Failed to sign in with Google. Please try again.");
      setIsGoogleLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
          <Check className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold">Check your email</h3>
        <p className="text-sm text-muted-foreground">
          We&apos;ve sent a verification link to your email address. Please click
          the link to verify your account.
        </p>
        <Button variant="outline" onClick={() => router.push("/auth/signin")}>
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {invite.status === "valid" && (
        <div
          role="status"
          className="p-4 text-sm bg-primary/5 border border-primary/20 rounded-md flex gap-3"
          data-testid="beta-invite-banner"
        >
          <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">
              You&apos;ve been invited to BrandsIQ closed beta
            </p>
            <p className="text-muted-foreground">
              Complete signup below to claim your beta plan: 150 response
              credits and 750 sentiment analyses per month.
            </p>
          </div>
        </div>
      )}

      {invite.status === "checking" && (
        <div
          role="status"
          className="p-3 text-sm text-muted-foreground bg-muted/30 border rounded-md flex items-center gap-2"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking your invite...
        </div>
      )}

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="name"
              type="text"
              placeholder="Your name"
              className="pl-10"
              disabled={isLoading}
              {...register("name")}
            />
          </div>
          {errors.name && (
            <p className="text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="pl-10"
              disabled={isLoading}
              {...register("email")}
            />
          </div>
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a password"
              className="pl-10 pr-10"
              disabled={isLoading}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-600">{errors.password.message}</p>
          )}
          <PasswordStrengthIndicator password={password} />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignIn}
        disabled={isGoogleLoading}
      >
        {isGoogleLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
        )}
        Continue with Google
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/auth/signin" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>

      <p className="text-center text-xs text-muted-foreground">
        By creating an account, you agree to our{" "}
        <Link href="/terms" className="underline hover:text-foreground">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-foreground">
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}

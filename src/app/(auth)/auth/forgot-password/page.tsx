"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations";
import { LOGO_RATIO } from "@/lib/constants";

export default function ForgotPasswordPage() {
  const { data: session, status: sessionStatus } = useSession();
  const isSignedIn = sessionStatus === "authenticated";
  const sessionEmail = session?.user?.email ?? "";

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    // Pre-fill the email field for signed-in users who arrived via the
    // "Change password" link on /dashboard/settings/profile. They shouldn't
    // have to re-type their own email to reset their password.
    values: isSignedIn && sessionEmail ? { email: sessionEmail } : undefined,
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        setIsSuccess(true);
      } else {
        setError(result.error?.message || "Failed to send reset email");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Where to send the user "back" to: dashboard settings for signed-in users
  // (the surface that brought them here), or the sign-in page otherwise.
  const backHref = isSignedIn ? "/dashboard/settings/profile" : "/auth/signin";
  const backLabel = isSignedIn ? "Back to profile settings" : "Back to sign in";

  if (isSuccess) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription>
            {isSignedIn
              ? "We've sent a password reset link to your email."
              : "If an account exists with that email address, we've sent a password reset link."}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            The link will expire in 1 hour.
          </p>
          <Link href={backHref}>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {backLabel}
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Link
            href="/"
            aria-label="Go to BrandsIQ home"
            className="flex items-center transition-opacity hover:opacity-90"
          >
            <Image
              src="/logo.png"
              alt="BrandsIQ"
              height={40}
              width={Math.round(40 * LOGO_RATIO)}
              priority
              className="h-10 w-auto"
            />
          </Link>
        </div>
        <CardTitle className="text-2xl font-bold">
          {isSignedIn ? "Reset your password" : "Forgot password?"}
        </CardTitle>
        <CardDescription>
          {isSignedIn
            ? "We'll send a reset link to your email."
            : "Enter your email and we'll send you a reset link"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>

        <div className="text-center">
          <Link
            href={backHref}
            className="text-sm text-primary hover:underline inline-flex items-center"
          >
            <ArrowLeft className="mr-1 h-3 w-3" />
            {backLabel}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Lock, Eye, EyeOff, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import { z } from "zod";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LOGO_RATIO, VALIDATION_LIMITS } from "@/lib/constants";

const resetPasswordFormSchema = z
  .object({
    password: z
      .string()
      .min(
        VALIDATION_LIMITS.PASSWORD_MIN,
        `Password must be at least ${VALIDATION_LIMITS.PASSWORD_MIN} characters`
      )
      .max(VALIDATION_LIMITS.PASSWORD_MAX, "Password is too long")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormInput = z.infer<typeof resetPasswordFormSchema>;

type PageStatus = "loading" | "valid" | "invalid" | "success";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<PageStatus>("loading");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormInput>({
    resolver: zodResolver(resetPasswordFormSchema),
  });

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    const validateToken = async () => {
      try {
        const response = await fetch(
          `/api/auth/password-reset/confirm?token=${token}`
        );
        const result = await response.json();

        if (response.ok && result.data?.valid) {
          setStatus("valid");
        } else {
          setStatus("invalid");
        }
      } catch {
        setStatus("invalid");
      }
    };

    validateToken();
  }, [token]);

  const onSubmit = async (data: ResetPasswordFormInput) => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });

      const result = await response.json();

      if (response.ok) {
        setStatus("success");
      } else {
        setError(result.error?.message || "Failed to reset password");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Validating reset link...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "invalid") {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <XCircle className="h-12 w-12 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Invalid or Expired Link</CardTitle>
          <CardDescription>
            This password reset link is invalid or has expired.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Please request a new password reset link.
          </p>
          <Link href="/auth/forgot-password">
            <Button>Request new link</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (status === "success") {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Password Reset!</CardTitle>
          <CardDescription>
            Your password has been successfully reset.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={() => router.push("/auth/signin")}>
            Sign in with new password
          </Button>
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
        <CardTitle className="text-2xl font-bold">Reset your password</CardTitle>
        <CardDescription>Enter your new password below</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm new password"
                className="pl-10 pr-10"
                disabled={isLoading}
                {...register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-600">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              "Reset password"
            )}
          </Button>
        </form>

        <div className="text-center">
          <Link
            href="/auth/signin"
            className="text-sm text-primary hover:underline inline-flex items-center"
          >
            <ArrowLeft className="mr-1 h-3 w-3" />
            Back to sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingFallback() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

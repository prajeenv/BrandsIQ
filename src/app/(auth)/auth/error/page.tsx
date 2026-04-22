"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SupportLink } from "@/components/shared/SupportLink";

const errorMessages: Record<string, string> = {
  Configuration: "There is a problem with the server configuration.",
  AccessDenied: "Access denied. You do not have permission to sign in.",
  Verification: "The verification link is invalid or has expired.",
  OAuthSignin: "Error starting the OAuth sign-in process.",
  OAuthCallback: "Error during the OAuth callback.",
  OAuthCreateAccount: "Could not create an OAuth account.",
  EmailCreateAccount: "Could not create an email account.",
  Callback: "Error during the callback process.",
  OAuthAccountNotLinked:
    "This email is already associated with another account. Please sign in using your original method.",
  EmailSignin: "Error sending the verification email.",
  CredentialsSignin: "Invalid email or password.",
  SessionRequired: "Please sign in to access this page.",
  Default: "An unexpected error occurred. Please try again.",
};

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessage =
    error && errorMessages[error]
      ? errorMessages[error]
      : errorMessages.Default;

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <AlertCircle className="h-12 w-12 text-red-600" />
        </div>
        <CardTitle className="text-2xl">Authentication Error</CardTitle>
        <CardDescription>{errorMessage}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        <Link href="/auth/signin">
          <Button>Try again</Button>
        </Link>
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          Return to home
        </Link>
        <SupportLink className="pt-2 text-center" />
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

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthErrorContent />
    </Suspense>
  );
}

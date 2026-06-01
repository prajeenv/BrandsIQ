import { Suspense } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth";

export const metadata: Metadata = {
  title: "Sign In - BrandsIQ",
  description: "Sign in to your BrandsIQ account",
};

function LoginFormWrapper() {
  return <LoginForm />;
}

export default function SignInPage() {
  return (
    <Card>
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <Link
            href="/"
            aria-label="Go to BrandsIQ home"
            className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xl font-bold transition-opacity hover:opacity-90"
          >
            R
          </Link>
        </div>
        <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
        <CardDescription>
          Sign in to your account to continue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<div className="text-center">Loading...</div>}>
          <LoginFormWrapper />
        </Suspense>
      </CardContent>
    </Card>
  );
}

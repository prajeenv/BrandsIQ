import { Suspense } from "react";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignupForm } from "@/components/auth";
import { LOGO_RATIO } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Sign Up - BrandsIQ",
  description: "Create your BrandsIQ account",
};

function SignupFormWrapper() {
  return <SignupForm />;
}

export default function SignUpPage() {
  return (
    <Card>
      <CardHeader className="space-y-1 text-center">
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
        <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
        <CardDescription>
          Get started with BrandsIQ for free
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<div className="text-center">Loading...</div>}>
          <SignupFormWrapper />
        </Suspense>
      </CardContent>
    </Card>
  );
}

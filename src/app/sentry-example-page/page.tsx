"use client";

import { Button } from "@/components/ui/button";

export default function SentryExamplePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold">Sentry Test Page</h1>
      <p className="text-muted-foreground max-w-md text-center">
        Click the button below to throw a client-side error. In production, it
        should appear in the Sentry dashboard within a minute.
      </p>
      <Button
        variant="destructive"
        onClick={() => {
          throw new Error("Sentry client test error");
        }}
      >
        Throw client error
      </Button>
    </div>
  );
}

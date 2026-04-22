"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { SUPPORT_EMAIL } from "@/lib/constants";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          fontFamily: "system-ui, sans-serif",
        }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
            Something went wrong!
          </h2>
          <p style={{ color: "#666" }}>
            {error.message || "An unexpected error occurred"}
          </p>
          <Button onClick={() => reset()}>Try again</Button>
          <p style={{ color: "#666", fontSize: "0.875rem", marginTop: "0.5rem" }}>
            Having trouble?{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              style={{ color: "#111", textDecoration: "underline" }}
            >
              Contact {SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      </body>
    </html>
  );
}

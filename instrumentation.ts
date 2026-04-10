/* eslint-disable no-console -- temporary diagnostic logging */
import * as Sentry from "@sentry/nextjs";

console.log("[sentry-debug] instrumentation.ts module evaluated", {
  nextRuntime: process.env.NEXT_RUNTIME,
  nodeEnv: process.env.NODE_ENV,
});

export async function register() {
  console.log("[sentry-debug] register() called", {
    nextRuntime: process.env.NEXT_RUNTIME,
  });

  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("[sentry-debug] importing sentry.server.config");
    await import("./sentry.server.config");
    console.log("[sentry-debug] sentry.server.config imported");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    console.log("[sentry-debug] importing sentry.edge.config");
    await import("./sentry.edge.config");
    console.log("[sentry-debug] sentry.edge.config imported");
  }
}

export const onRequestError = Sentry.captureRequestError;

/* eslint-disable no-console -- temporary diagnostic logging */
import * as Sentry from "@sentry/nextjs";

console.log("[sentry-debug] sentry.server.config.ts evaluating", {
  hasDsn: !!process.env.SENTRY_DSN,
  nodeEnv: process.env.NODE_ENV,
});

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production",
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0,
  debug: true,
});

console.log("[sentry-debug] Sentry.init completed", {
  clientReady: !!Sentry.getClient(),
});

/* eslint-disable no-console -- temporary diagnostic logging, will be reverted */
import * as Sentry from "@sentry/nextjs";

console.log("[sentry-debug] server config loading", {
  hasDsn: !!process.env.SENTRY_DSN,
  dsnPrefix: process.env.SENTRY_DSN?.substring(0, 20),
  nodeEnv: process.env.NODE_ENV,
  vercelEnv: process.env.VERCEL_ENV,
});

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production",
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0,
  debug: true,
});

console.log("[sentry-debug] server config initialized");

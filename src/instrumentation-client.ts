import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production",
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  // NOTE: previously `integrations: []`, which removed Sentry's default
  // integration set — including `globalHandlers`, the integration that
  // hooks window.onerror / unhandledrejection. With it gone, uncaught
  // client errors logged to the console were never sent to Sentry
  // (verified via /sentry-example-page: error appeared in console, never
  // in Sentry Issues). Omitting `integrations` entirely restores the
  // SDK defaults so uncaught errors are captured. We deliberately do NOT
  // re-enable Replay (replaysSessionSampleRate/replaysOnErrorSampleRate
  // stay 0) and keep tracesSampleRate 0 — error capture only, no perf or
  // session-replay cost. The server and edge configs already use
  // defaults; only the client config had this override.
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

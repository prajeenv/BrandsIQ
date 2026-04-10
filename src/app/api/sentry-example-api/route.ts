/* eslint-disable no-console -- temporary diagnostic logging */
import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";

export async function GET() {
  console.log("[sentry-debug] route handler invoked", {
    hasDsn: !!process.env.SENTRY_DSN,
    clientReady: !!Sentry.getClient(),
    nodeEnv: process.env.NODE_ENV,
    nextRuntime: process.env.NEXT_RUNTIME,
  });

  try {
    throw new Error("Sentry server test error v2");
  } catch (error) {
    const eventId = Sentry.captureException(error);
    console.log("[sentry-debug] captureException returned", { eventId });
    const flushed = await Sentry.flush(2000);
    console.log("[sentry-debug] flush returned", { flushed });
    throw error;
  }
}

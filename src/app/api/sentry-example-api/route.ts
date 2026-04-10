import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";

export async function GET() {
  console.log("[sentry-debug] route handler invoked", {
    hasDsn: !!process.env.SENTRY_DSN,
    clientReady: !!Sentry.getClient(),
    nodeEnv: process.env.NODE_ENV,
  });

  try {
    throw new Error("Sentry server test error");
  } catch (error) {
    console.log("[sentry-debug] calling captureException");
    const eventId = Sentry.captureException(error);
    console.log("[sentry-debug] captureException returned", { eventId });
    // Required on Vercel serverless: Lambda shuts down before Sentry's
    // background flush completes. Must await flush to force event send.
    console.log("[sentry-debug] awaiting flush");
    const flushed = await Sentry.flush(2000);
    console.log("[sentry-debug] flush returned", { flushed });
    throw error;
  }
}

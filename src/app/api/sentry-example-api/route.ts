import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    throw new Error("Sentry server test error");
  } catch (error) {
    Sentry.captureException(error);
    // Required on Vercel serverless: Lambda shuts down before Sentry's
    // background flush completes. Must await flush to force event send.
    await Sentry.flush(2000);
    throw error;
  }
}

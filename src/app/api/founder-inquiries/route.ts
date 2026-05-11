import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createFounderInquirySchema } from "@/lib/validations";
import { sendFounderInquiryNotification } from "@/lib/email";
import { apiRateLimit, getClientIP, checkRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/founder-inquiries
 *
 * Used in four places per MVP.md Section 13.4:
 *  - Expired-link recovery page (unauthenticated, submitter contact required)
 *  - "Request beta access" CTA on /pricing (auth state varies)
 *  - "Request beta access" or "Request more credits" CTA on the zero-balance
 *    dialog (always authenticated, contact info pulled from session if absent)
 *  - Auto-fired from /onboarding when a non-beta user expresses beta intent
 *
 * The form submission is the same shape regardless of source; the route uses
 * `type` and `source` to classify. Auth-state determines whether userId is set
 * and whether session info backfills missing submitter fields.
 *
 * Always returns 200 on validation/auth failures (rate-limit returns 429),
 * because the form is shown on public surfaces and we don't want to leak
 * whether a particular submission was accepted. The founder sees genuine
 * inquiries in /dashboard/admin/founder-inquiries; spam/garbage gets rate-
 * limited away.
 */
export async function POST(request: Request) {
  // Per-IP rate limit. apiRateLimit = 60 req/min by default — way more than
  // any legitimate use of this form, low enough to defeat trivial spam.
  const ip = getClientIP(request);
  const rateLimitResult = await checkRateLimit(apiRateLimit, `founder-inquiry:${ip}`);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: rateLimitResult.error },
      { status: 429, headers: rateLimitResult.headers },
    );
  }

  const session = await auth();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid request body" },
      },
      { status: 400, headers: rateLimitResult.headers },
    );
  }

  const parsed = createFounderInquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message ?? "Invalid request",
          details: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 400, headers: rateLimitResult.headers },
    );
  }

  const data = parsed.data;

  // Backfill submitter info from the session when the caller is authenticated
  // and didn't include it in the form body. Pre-signup surfaces (expired-link
  // page) always include contact info; signed-in surfaces (zero-balance dialog)
  // can rely on the session.
  const submitterName =
    data.submitterName ?? session?.user?.name ?? null;
  const submitterEmail =
    data.submitterEmail ?? session?.user?.email ?? null;

  // Hard requirement: we must have *some* way to reach the submitter, either
  // via session email or explicit submitter email. Without it, the inquiry
  // is unactionable.
  if (!submitterEmail) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "An email address is required so we can reply.",
        },
      },
      { status: 400, headers: rateLimitResult.headers },
    );
  }

  const inquiry = await prisma.founderInquiry.create({
    data: {
      type: data.type,
      source: data.source ?? null,
      userId: session?.user?.id ?? null,
      submitterName,
      submitterEmail,
      businessName: data.businessName ?? null,
      message: data.message,
    },
  });

  // Notify the founder via Resend. Non-blocking from the user's perspective;
  // wrapped in catch so an email send failure doesn't fail the inquiry.
  void sendFounderInquiryNotification({
    type: data.type,
    source: data.source ?? null,
    submitterName,
    submitterEmail,
    businessName: data.businessName ?? null,
    message: data.message,
    inquiryId: inquiry.id,
  }).catch((err) => {
    console.error("Failed to send founder inquiry notification:", err);
  });

  return NextResponse.json(
    {
      success: true,
      data: { inquiryId: inquiry.id },
    },
    { status: 201, headers: rateLimitResult.headers },
  );
}

import { NextRequest, NextResponse } from "next/server";
import { integrationGenerateSchema } from "@/lib/validations";
import { generateReviewResponse } from "@/lib/ai/claude";
import { normalizeBrandVoice } from "@/lib/ai/brand-voice-normalize";
import { detectLanguage } from "@/lib/language-detection";
import { aiRateLimit, getClientIP, checkRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/integrations/generate-response
 *
 * Key-authenticated, server-to-server endpoint that generates a BrandsIQ
 * review response from RAW review text — no user account, no stored review,
 * no stored brand voice, no credit deduction. Built for the One-Pager Mailer
 * (Google Apps Script) so it can fill the `Generated Response` column for
 * prospects who are not BrandsIQ users. See
 * docs/MVP_Phase-1/ONE_PAGER_MAILER_DESIGN.md Section 10.
 *
 * Auth: mirrors the cron route's Bearer-secret pattern
 * (src/app/api/cron/reset-credits/route.ts) but with a SEPARATE secret,
 * INTEGRATIONS_API_KEY, for blast-radius isolation. This path is intentionally
 * NOT in `protectedApiRoutes` in src/middleware.ts, so the request reaches this
 * handler and self-authenticates here (same convention as /api/cron).
 *
 * Generation: runs the real Claude pipeline via `generateReviewResponse` with
 * a default brand voice (`normalizeBrandVoice(null)`) and `isTestMode: true`
 * so no credit path executes. The reply always follows the review's DETECTED
 * language (no responseLanguage override) — BrandsIQ default behaviour. Returns
 * the model BODY only (skips `assembleResponse`, so no salutation/sign-off);
 * the flyer deck supplies its own framing.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Auth — Bearer key. Unlike the cron route, there is NO dev bypass
    //    when the secret is unset: this endpoint spends Claude tokens, so
    //    require the key in every environment.
    const expectedKey = process.env.INTEGRATIONS_API_KEY;
    if (!expectedKey) {
      // Misconfiguration, not a client error. 503 mirrors the
      // "service not configured" shape used elsewhere.
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "API_NOT_CONFIGURED",
            message: "Integration endpoint is not configured.",
          },
        },
        { status: 503 }
      );
    }

    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Invalid or missing API key" },
        },
        { status: 401 }
      );
    }

    // 2. Rate limit — per-IP, AI bucket (10/min). Falls back to the in-memory
    //    limiter when Upstash is unconfigured.
    const ip = getClientIP(request);
    const rateLimitResult = await checkRateLimit(
      aiRateLimit,
      `integrations-generate:${ip}`
    );
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: rateLimitResult.error },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    // 3. Parse + validate body.
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Invalid request body" },
        },
        { status: 400, headers: rateLimitResult.headers }
      );
    }

    const validationResult = integrationGenerateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: validationResult.error.issues[0]?.message || "Invalid input",
            details: validationResult.error.issues,
          },
        },
        { status: 400, headers: rateLimitResult.headers }
      );
    }

    const { reviewText, platform, rating } = validationResult.data;

    // 4. Detect language — drives the reply language (no override).
    const languageResult = detectLanguage(reviewText);

    // 5. Default brand voice — no user, no DB read. normalizeBrandVoice(null)
    //    returns a fully-formed default (friendly_professional + sane defaults)
    //    with responseLanguage unset, so the reply follows the detected language.
    const brandVoice = normalizeBrandVoice(null);

    // 6. Generate. isTestMode: true guarantees no credit path runs.
    const generated = await generateReviewResponse({
      reviewText,
      platform,
      rating: rating ?? null,
      detectedLanguage: languageResult.language,
      brandVoice,
      isTestMode: true,
    });

    // 7. Return the raw model body (no assembleResponse — flyer wants body only).
    return NextResponse.json(
      {
        success: true,
        data: {
          responseText: generated.responseText,
          model: generated.model,
          language: generated.effectiveLanguage,
        },
      },
      { headers: rateLimitResult.headers }
    );
  } catch (error) {
    console.error("Error in integrations generate-response:", error);

    if (error instanceof Error && error.message.includes("ANTHROPIC_API_KEY")) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "API_NOT_CONFIGURED",
            message: "AI service is not configured.",
          },
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to generate response",
        },
      },
      { status: 500 }
    );
  }
}

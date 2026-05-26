"use client";

import posthog from "posthog-js";

/**
 * Typed PostHog event helpers for BrandsIQ.
 *
 * Why this module exists:
 *  - Single source of truth for event names and property shapes. Stops the
 *    classic "is it beta_invite_used or beta_invite_link_used?" drift.
 *  - Properties are intentionally low-PII: we attach categorical context
 *    (industry, businessType, country, tier) but never organisation name
 *    or other identifying strings. User-level joins live on PostHog's
 *    Person record via posthog.identify() — see identifyUser() below.
 *  - All calls are client-side. If a server-side event ever proves
 *    necessary (e.g. an event that must fire even if the tab closes
 *    mid-request), wire it via the posthog-node SDK separately rather
 *    than calling these helpers from the server.
 *
 * MVP Phase 1 iteration 3 — see docs/MVP_Phase-1/MVP.md Section 13.9 and
 * Section 14 (Validation Targets).
 */

// Categorical/non-PII props that frequently appear together. Keep this list
// small — the goal is "useful for segmentation in PostHog dashboards", not
// "shovel everything into the event."
export interface BetaContext {
  isBetaUser: boolean;
  tier: string; // "FREE" | "STARTER" | "GROWTH"
}

export interface BusinessContext {
  industry?: string | null;
  businessType?: string | null;
  country?: string | null;
}

// ============================================================================
// Identification
// ============================================================================

/**
 * Associate the current PostHog session with a user. Call this on sign-in
 * (and ideally any time the session refreshes). PostHog will then attach
 * the same distinctId to anonymous events that happened before sign-in via
 * its alias mechanism — preserving the funnel from landing-page to signup.
 *
 * Person properties (set on the User record in PostHog, not on each event):
 *  - tier, isBetaUser: useful for cohort filtering on dashboards
 *  - we deliberately do NOT set name/email/organizationName here — those
 *    are reachable via the BrandsIQ DB if a specific user needs to be
 *    looked up. Keeping PostHog free of them simplifies GDPR deletion.
 */
export function identifyUser(
  userId: string,
  props: BetaContext,
): void {
  if (typeof window === "undefined") return;
  posthog.identify(userId, {
    tier: props.tier,
    isBetaUser: props.isBetaUser,
  });
}

/**
 * Clear the PostHog session. Call on sign-out so subsequent anonymous
 * events on the same browser aren't attributed to the previous user.
 */
export function resetUser(): void {
  if (typeof window === "undefined") return;
  posthog.reset();
}

// ============================================================================
// Event capture
// ============================================================================

/**
 * Thin wrapper around posthog.capture so we can centralise SSR guards and
 * test stubs. Not exported — call sites use the typed helpers below.
 */
function capture(
  eventName: string,
  properties: Record<string, unknown> = {},
): void {
  if (typeof window === "undefined") return;
  posthog.capture(eventName, properties);
}

// ----------------------------------------------------------------------------
// Signup + onboarding
// ----------------------------------------------------------------------------

/**
 * Fires when a user completes signup with a valid beta invite code.
 * Source: SignupForm post-success, when betaCode is present and valid.
 *
 * Note: organizationName / businessName are deliberately omitted — see
 * the module-level comment about low-PII event properties.
 */
/**
 * Note on `daysToUse`: the original plan included this as a prop, computed
 * from BetaInviteLink.createdAt at signup time. The validate endpoint
 * (/api/beta-invites/[code]/validate) doesn't currently return createdAt
 * to clients — extending it is filed as a follow-up. Today the event fires
 * without any properties; we'll add daysToUse when the endpoint is updated.
 */
export function trackSignupCompletedWithBeta(): void {
  capture("signup_completed_with_beta", {});
}

/**
 * Fires when a user completes signup without a beta invite (Free tier).
 */
export function trackSignupCompletedNoBeta(): void {
  capture("signup_completed_no_beta", {});
}

/**
 * Fires when the user submits the onboarding form successfully.
 * Captures the categorical signals (industry/businessType/country)
 * that we'll group by in PostHog to answer "what kinds of businesses
 * are signing up?".
 */
export function trackOnboardingCompleted(props: BusinessContext): void {
  capture("onboarding_completed", {
    industry: props.industry ?? null,
    businessType: props.businessType ?? null,
    country: props.country ?? null,
  });
}

// ----------------------------------------------------------------------------
// Beta invite flow
// ----------------------------------------------------------------------------

/**
 * Fires when an invite link is successfully claimed (server-side validation
 * passes and the user record is updated to isBetaUser=true). Currently
 * fired client-side from the signup form post-success — see note about
 * server-side instrumentation in module-level docs.
 */
export function trackBetaInviteLinkUsed(): void {
  // daysToUse will be added once /api/beta-invites/[code]/validate
  // exposes createdAt — see comment on trackSignupCompletedWithBeta.
  capture("beta_invite_link_used", {});
}

// ----------------------------------------------------------------------------
// Founder inquiry
// ----------------------------------------------------------------------------

/**
 * Fires when the founder-inquiry form submits successfully. Used in four
 * places (expired-link recovery, pricing CTA, zero-balance dialog,
 * low-credit warning, onboarding-intent), distinguished by `source`.
 */
export function trackFounderInquirySubmitted(props: {
  type:
    | "beta_request"
    | "more_credits"
    | "general"
    | "expired_link_recovery";
  source:
    | "expired_link"
    | "pricing"
    | "zero_balance"
    | "onboarding_intent"
    | "other";
}): void {
  capture("founder_inquiry_submitted", props);
}

// ----------------------------------------------------------------------------
// Credit lifecycle
// ----------------------------------------------------------------------------

/**
 * Fires when the OutOfCreditsDialog opens. Tracks how often users hit
 * the wall and which user segment is hitting it.
 */
export function trackZeroBalanceDialogShown(props: BetaContext): void {
  capture("zero_balance_dialog_shown", { ...props });
}

/**
 * Fires when credits drop to the low threshold (≤20% remaining) and the
 * LowCreditWarning banner appears for the first time in a session.
 * Suppress repeat-fires within a single render lifecycle via the caller.
 */
export function trackCreditBalanceLow(props: BetaContext): void {
  capture("credit_balance_low", { ...props });
}

// ----------------------------------------------------------------------------
// AI usage
// ----------------------------------------------------------------------------

/**
 * Fires when the user successfully generates a response for a review.
 * `tone` is the only required prop — review language and rating are
 * useful future signals but not yet plumbed through the client API
 * response shape (filed as follow-up).
 */
export function trackResponseGenerated(props: { tone: string }): void {
  capture("response_generated", { tone: props.tone });
}

/**
 * Fires when the user regenerates an existing response.
 *
 * Properties:
 *  - `tone` — the brand voice tone applied (5/25: tone selector dropped
 *    from the dialog, so this is always the brand voice tone).
 *  - `hadAdditionalInstructions` — boolean. Did the user type anything
 *    into the regenerate dialog's textarea? Tells us how often the
 *    feature is used at all.
 *  - `instructionLength` — character length of the trimmed instruction,
 *    or undefined when none was provided. Lets us see the distribution
 *    of how much users type (one-liner instruction vs. paragraph). Raw
 *    text is NOT sent — PostHog stays free of free-form PII; the raw
 *    text is queryable in Postgres for ad-hoc analysis.
 */
export function trackResponseRegenerated(props: {
  tone: string;
  hadAdditionalInstructions: boolean;
  instructionLength?: number;
}): void {
  capture("response_regenerated", {
    tone: props.tone,
    hadAdditionalInstructions: props.hadAdditionalInstructions,
    instructionLength: props.instructionLength,
  });
}

/**
 * Fires when sentiment analysis runs successfully for a new review.
 * Skipped sentiment (no credits) does NOT fire this event — see the
 * separate sentimentSkipped indicator in the review detail flow.
 */
export function trackSentimentAnalyzed(props: {
  sentiment: "positive" | "neutral" | "negative";
}): void {
  capture("sentiment_analyzed", props);
}

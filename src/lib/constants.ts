/**
 * Application constants for BrandsIQ
 */

// Brand logo aspect ratio. The wordmark asset (public/logo.png) is 1151x262
// (~4.39:1, tightly cropped). Spots render it at a fixed height and derive the
// width from this ratio so next/image reserves the right box (no layout shift).
// Single source of truth: if the logo is ever re-cut at a different ratio,
// change it here.
export const LOGO_RATIO = 1151 / 262;

// Review platforms supported
export const PLATFORMS = [
  "Google",
  "Amazon",
  "Yelp",
  "TripAdvisor",
  "Facebook",
  "Trustpilot",
  "G2",
  "Capterra",
  "App Store",
  "Play Store",
  "Other",
] as const;

export type Platform = (typeof PLATFORMS)[number];

// Sentiment types
export const SENTIMENTS = ["positive", "neutral", "negative"] as const;
export type Sentiment = (typeof SENTIMENTS)[number];

// Response tones
export const RESPONSE_TONES = ["professional", "friendly", "empathetic"] as const;
export type ResponseTone = (typeof RESPONSE_TONES)[number];

// Brand voice tones (for brand voice configuration)
//
// Legacy lowercase set retained until iteration 6 cuts the API over to V2.
// New set lives in BRAND_VOICE_TONES_V2 below.
export const BRAND_VOICE_TONES = ["professional", "friendly", "casual", "empathetic"] as const;
export type BrandVoiceTone = (typeof BRAND_VOICE_TONES)[number];

// Brand voice tone descriptions
export const BRAND_VOICE_TONE_INFO: Record<BrandVoiceTone, { label: string; description: string; icon: string }> = {
  professional: {
    label: "Professional",
    description: "Formal, business-like, and polished responses",
    icon: "briefcase",
  },
  friendly: {
    label: "Friendly",
    description: "Warm, approachable, and personable responses",
    icon: "smile",
  },
  casual: {
    label: "Casual",
    description: "Relaxed, conversational, and informal responses",
    icon: "coffee",
  },
  empathetic: {
    label: "Empathetic",
    description: "Understanding, compassionate, and supportive responses",
    icon: "heart",
  },
};

// ─── Brand voice redesign (iter 2) ──────────────────────────────────
// Spec: docs/MVP_Phase-1/BRAND_VOICE_REDESIGN.md §4.1.
//
// V2 stores stable lowercase keys in the DB and renders the display label
// via a map (DECISION #2 in the redesign plan). Avoids coupling DB values
// to UI copy and lets the regenerate tone-modifier share the same key set
// as the brand voice tone field (spec §8.1).

export const BRAND_VOICE_TONES_V2 = [
  "warm_casual",
  "friendly_professional",
  "polished_formal",
  "empathetic_attentive",
] as const;
export type BrandVoiceToneV2 = (typeof BRAND_VOICE_TONES_V2)[number];

export const DEFAULT_BRAND_VOICE_TONE_V2: BrandVoiceToneV2 = "friendly_professional";

export const BRAND_VOICE_TONE_INFO_V2: Record<
  BrandVoiceToneV2,
  { label: string; description: string; icon: string }
> = {
  warm_casual: {
    label: "Warm & casual",
    description: "Relaxed, like greeting a returning guest at the door",
    icon: "coffee",
  },
  friendly_professional: {
    label: "Friendly & professional",
    description: "Warm but composed, the default for most hospitality brands",
    icon: "smile",
  },
  polished_formal: {
    label: "Polished & formal",
    description: "Refined and precise, for premium and luxury experiences",
    icon: "briefcase",
  },
  empathetic_attentive: {
    label: "Empathetic & attentive",
    description: "For guests whose experience matters most, used heavily on complaints",
    icon: "heart",
  },
};

/**
 * Legacy → V2 tone key mapping (spec §4.1 / §8.1).
 *
 * Used by `normalizeBrandVoice` in claude.ts so existing rows (and the
 * regenerate tone-modifier values stored on `ReviewResponse.toneUsed`)
 * stay valid until iteration 6 cuts the API over to V2 keys.
 *
 * Note: iteration 3 will TRUNCATE `brand_voices` (test data only), so this
 * mapping primarily protects in-flight data — defaults, `toneUsed` strings
 * already persisted on responses, and any code path that still passes the
 * old key set.
 */
export const LEGACY_TONE_TO_V2: Record<string, BrandVoiceToneV2> = {
  // BrandVoiceTone (legacy stored values)
  friendly: "friendly_professional",
  professional: "friendly_professional",
  casual: "warm_casual",
  formal: "polished_formal", // never persisted (only "formal" check was in a schema comment), but mapped defensively
  empathetic: "empathetic_attentive",
  // ResponseTone / ToneModifier values stored on ReviewResponse.toneUsed —
  // these become the new key set on read so the regenerate selector aligns.
  // "default" is also used in production (initial generation toneUsed) so it
  // resolves to the default key — the model's tone modifier path is unaffected.
  default: "friendly_professional",
};

// Spec §7.4 — negative-review email framing options.
export const NEGATIVE_REVIEW_FRAMINGS = [
  "management_contact",
  "investigation",
  "open_channel",
  "custom",
] as const;
export type NegativeReviewFraming = (typeof NEGATIVE_REVIEW_FRAMINGS)[number];

export const DEFAULT_NEGATIVE_REVIEW_FRAMING: NegativeReviewFraming = "investigation";

/**
 * Brand voice limits — V2 shape.
 *
 * Spec §4.2, §4.3, §5.1, §7.x.
 *
 * Per-item / total caps for the new V2 schema. The legacy `BRAND_VOICE_LIMITS`
 * stays exported until iteration 6 cuts the form payload to V2.
 */
export const BRAND_VOICE_LIMITS_V2 = {
  // Style guidelines
  STYLE_GUIDELINE_ITEM_MAX: 200,
  STYLE_GUIDELINES_MAX_ITEMS: 10,
  STYLE_GUIDELINES_TOTAL_MAX: 2000,
  // Key phrases
  KEY_PHRASE_MAX: 100,
  KEY_PHRASES_MAX_ITEMS: 10,
  // Sample responses
  SAMPLE_RESPONSE_MAX: 1000,
  SAMPLE_RESPONSES_MAX_ITEMS: 5,
  // Contact & sign-off
  SALUTATION_MAX: 100,
  SIGNOFF_MAX: 500,
  FRAMING_CUSTOM_MAX: 500,
  REPLY_TO_EMAIL_MAX: 254,
  // Response language override (display-name of a LANGUAGE_MAP value).
  // The longest name in LANGUAGE_MAP today is "Chinese (Traditional)" at
  // 21 chars; 50 leaves comfortable headroom for any future addition.
  RESPONSE_LANGUAGE_MAX: 50,
} as const;

// Spec / decision 3 — the model is told to generate a body of approximately
// 200 words; this constant is the hard char cap on the model-emitted body
// (before post-processing prepends salutation + appends sign-off + optional
// email). VALIDATION_LIMITS.RESPONSE_TEXT_MAX (2000) is the assembled-and-
// stored cap.
export const RESPONSE_BODY_CHAR_MAX = 1200;

// Formality level labels
export const FORMALITY_LABELS = [
  "Very Casual",
  "Casual",
  "Balanced",
  "Formal",
  "Very Formal",
] as const;

// Formality level descriptions (for UI display)
export const FORMALITY_DESCRIPTIONS = [
  "Very casual and conversational, like talking to a friend",
  "Casual but still polite and friendly",
  "Balanced mix of professional and approachable",
  "Formal and professional with proper business language",
  "Very formal, polished, and highly professional",
] as const;

// Brand voice limits
export const BRAND_VOICE_LIMITS = {
  KEY_PHRASES_MAX: 20,
  SAMPLE_RESPONSES_MAX: 5,
  STYLE_NOTES_MAX: 500,
  KEY_PHRASE_MAX_LENGTH: 100,
  SAMPLE_RESPONSE_MAX_LENGTH: 500,
} as const;

// User subscription tiers
export const SUBSCRIPTION_TIERS = ["FREE", "STARTER", "GROWTH"] as const;
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

// Tier limits (from CORE_SPECS.md)
export const TIER_LIMITS: Record<
  SubscriptionTier,
  {
    credits: number;
    sentimentQuota: number;
    price: number;
    name: string;
  }
> = {
  FREE: {
    credits: 15,
    sentimentQuota: 35,
    price: 0,
    name: "Free",
  },
  STARTER: {
    credits: 30,
    sentimentQuota: 150,
    price: 29,
    name: "Starter",
  },
  GROWTH: {
    credits: 100,
    sentimentQuota: 500,
    price: 79,
    name: "Growth",
  },
};

// MVP Phase 1: Beta plan allocation (overrides tier limits when User.isBetaUser is true).
// See docs/MVP_Phase-1/MVP.md Section 12.3.
export const BETA_PLAN = {
  credits: 150,
  sentimentQuota: 750,
  name: "Beta",
} as const;

// MVP Phase 1: Beta invite link expiry (60 days from creation).
// See docs/MVP_Phase-1/MVP.md Section 13.1.
export const BETA_INVITE_EXPIRY_DAYS = 60;

// MVP Phase 1: Profile registration choices (see MVP.md Section 9).
//
// Two-level cascade. INDUSTRIES is the top-level category the user picks
// first; BUSINESS_TYPES_BY_INDUSTRY is the dependent dropdown keyed on the
// industry. Both lists are closed sets with "Other" as a soft escape hatch.
//
// Source: docs/MVP_Phase-1/Business Universe.md. Healthcare is intentionally
// excluded for the MVP — the prompt engineering for GDPR/HIPAA-safe replies
// hasn't been validated. We'll add it when there's a clear demand signal.
//
// IMPORTANT: when industry is "Other" we don't show the businessType dropdown
// at all. Server-side validation must therefore allow businessType to be
// absent in that case.
export const INDUSTRIES = [
  "Food & Beverage",
  "Hospitality",
  "Retail",
  "E-commerce",
  "Health, Wellness & Beauty",
  "Automotive",
  "Leisure & Entertainment",
  "Professional Services",
  "Other",
] as const;
export type Industry = (typeof INDUSTRIES)[number];

// Business types — second-level cascade. Each industry has its own list with
// "Other" at the end as the escape hatch. "Other" industry has no list (we
// hide the second dropdown entirely in the UI).
export const BUSINESS_TYPES_BY_INDUSTRY = {
  "Food & Beverage": [
    "Restaurant",
    "Franchise restaurant",
    "Cafe / coffee shop",
    "Fast casual",
    "Ghost kitchen",
    "Food delivery brand",
    "Bakery / dessert",
    "Other",
  ],
  Hospitality: [
    "Boutique hotel",
    "Hotel franchise",
    "Serviced apartment",
    "Hostel",
    "Resort",
    "Vacation rental management",
    "Other",
  ],
  Retail: [
    "Eyeglasses / optical",
    "Clothing",
    "Shoe",
    "Independent retail (fashion, home, lifestyle)",
    "Supermarket / grocery",
    "Pharmacy",
    "Electronics / tech retail",
    "Sporting goods",
    "Pet supply",
    "Furniture / home decor",
    "Other",
  ],
  "E-commerce": [
    "Amazon third-party seller",
    "Shopify store",
    "WooCommerce / WordPress store",
    "Etsy seller",
    "Multi-brand e-commerce",
    "Other",
  ],
  "Health, Wellness & Beauty": [
    "Spa",
    "Gym / fitness studio",
    "Hair salon",
    "Beauty clinic (aesthetics, laser)",
    "Yoga / pilates studio",
    "Other",
  ],
  Automotive: [
    "Car dealership group",
    "Auto repair",
    "Car rental (regional)",
    "Tyre / service centre",
    "Other",
  ],
  "Leisure & Entertainment": [
    "Cinema (independent/regional)",
    "Escape room",
    "Bowling / activity centre",
    "Golf club / driving range",
    "Trampoline / indoor activity park",
    "Other",
  ],
  "Professional Services": [
    "Co-working space",
    "Accountancy firm",
    "Real estate / lettings agency",
    "Cleaning service",
    "Removal company",
    "Other",
  ],
  // "Other" industry has no business-type cascade — the UI hides the second
  // dropdown and the schema accepts businessType as null. Empty array kept for
  // a stable shape: callers can do BUSINESS_TYPES_BY_INDUSTRY[industry] ?? [].
  Other: [],
} as const satisfies Record<Industry, readonly string[]>;

// Union type of every business-type string across all industries, plus "Other".
// Used by the Zod enum + Prisma column to keep things type-safe end-to-end.
export type BusinessType =
  (typeof BUSINESS_TYPES_BY_INDUSTRY)[keyof typeof BUSINESS_TYPES_BY_INDUSTRY][number];

// Flat array of every valid business-type string (de-duplicated). Used by
// Zod to validate the field. "Other" appears in many sub-lists so we
// deduplicate via Set.
export const BUSINESS_TYPES = Array.from(
  new Set(
    Object.values(BUSINESS_TYPES_BY_INDUSTRY).flat() as readonly string[],
  ),
) as readonly BusinessType[];

// Subset of countries — beta will start in a few markets, full list isn't worth
// the validation overhead until we have real demand from elsewhere. Add as
// needed; the `Other` option captures everything else for now.
export const COUNTRIES = [
  "United Kingdom",
  "Ireland",
  "United States",
  "Canada",
  "Germany",
  "France",
  "Spain",
  "Netherlands",
  "Belgium",
  "Other",
] as const;
export type Country = (typeof COUNTRIES)[number];

// Signup-intent question (asked only of users who arrived WITHOUT a beta
// invite link). See MVP.md Section 9. "yes" + non-empty challenge text triggers
// a FounderInquiry of type beta_request so the founder is notified.
export const SIGNUP_INTENTS = ["yes", "just_trying", "unsure"] as const;
export type SignupIntent = (typeof SIGNUP_INTENTS)[number];

// MVP Phase 1: FounderInquiry classification. See MVP.md Section 13.4.
// Stored as strings on FounderInquiry.type. The enum-as-string pattern matches
// how we handle Tier vs. SubscriptionTier elsewhere.
export const FOUNDER_INQUIRY_TYPES = [
  "beta_request",
  "more_credits",
  "general",
  "expired_link_recovery",
] as const;
export type FounderInquiryType = (typeof FOUNDER_INQUIRY_TYPES)[number];

// Where the inquiry was submitted from. Used for PostHog event correlation in
// iteration 3 ("which surface drives the most inquiries?").
export const FOUNDER_INQUIRY_SOURCES = [
  "expired_link",
  "pricing",
  "zero_balance",
  "onboarding_intent",
  "other",
] as const;
export type FounderInquirySource = (typeof FOUNDER_INQUIRY_SOURCES)[number];

// Returns the effective monthly allocation for a user.
// Beta users get the BETA_PLAN allocation regardless of tier; others get their tier's limits.
// Used by db-utils.ts:resetMonthlyCredits and new-user initialization in auth.ts/signup route.
export function getEffectiveAllocation(user: { tier: SubscriptionTier; isBetaUser: boolean }): {
  credits: number;
  sentimentQuota: number;
} {
  if (user.isBetaUser) {
    return { credits: BETA_PLAN.credits, sentimentQuota: BETA_PLAN.sentimentQuota };
  }
  const limits = TIER_LIMITS[user.tier];
  return { credits: limits.credits, sentimentQuota: limits.sentimentQuota };
}

// Credit costs
export const CREDIT_COSTS = {
  GENERATE_RESPONSE: 1.0,
  REGENERATE_RESPONSE: 1.0,
} as const;

// Validation limits
//
// RESPONSE_TEXT_MAX raised from 500 to 2000 in the brand voice redesign
// (iter 2): the new design assembles salutation + multi-paragraph body +
// sign-off + optional reply-to email, none of which fit inside 500 chars.
// The model-emitted body has its own narrower cap (RESPONSE_BODY_CHAR_MAX
// above ≈ "approximately 200 words"); this constant is the assembled-and-
// stored cap and also bounds manual edits in updateResponseSchema.
// ReviewResponse.responseText is @db.Text (no DB cap) so the raise is a
// pure validation/UI concern.
export const VALIDATION_LIMITS = {
  REVIEW_TEXT_MIN: 1,
  // Bumped from 2000 → 4000 after seeing real customer reviews exceed 2000
  // chars (~2900 in one observed hospitality complaint). Postgres column is
  // `@db.Text` (unbounded) so this is purely a Zod + UI concern; no DB
  // migration needed.
  REVIEW_TEXT_MAX: 4000,
  RESPONSE_TEXT_MAX: 2000,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 100,
  NAME_MAX: 100,
  EMAIL_MAX: 255,
  // MVP Phase 1 onboarding + founder-inquiry fields
  ORGANIZATION_NAME_MAX: 200,
  LOCATION_NAME_MAX: 100,
  SIGNUP_CHALLENGE_TEXT_MAX: 1000,
  INQUIRY_MESSAGE_MAX: 2000,
  INQUIRY_BUSINESS_NAME_MAX: 200,
  FOUNDER_NOTES_MAX: 2000,
  LOCATION_COUNT_MAX: 1000,
} as const;

// RTL languages
export const RTL_LANGUAGES = ["Arabic", "Hebrew", "Persian", "Urdu"] as const;

// Language map for franc library
export const LANGUAGE_MAP: Record<string, string> = {
  eng: "English",
  spa: "Spanish",
  fra: "French",
  deu: "German",
  ita: "Italian",
  por: "Portuguese",
  nld: "Dutch",
  pol: "Polish",
  rus: "Russian",
  jpn: "Japanese",
  cmn: "Chinese (Simplified)",
  zho: "Chinese (Traditional)",
  kor: "Korean",
  ara: "Arabic",
  heb: "Hebrew",
  hin: "Hindi",
  tur: "Turkish",
  vie: "Vietnamese",
  tha: "Thai",
  ind: "Indonesian",
  msa: "Malay",
  fil: "Filipino",
  swe: "Swedish",
  dan: "Danish",
  fin: "Finnish",
  nor: "Norwegian",
  ces: "Czech",
  hun: "Hungarian",
  ron: "Romanian",
  ukr: "Ukrainian",
  cat: "Catalan",
  hrv: "Croatian",
  srp: "Serbian",
  slv: "Slovenian",
  bul: "Bulgarian",
  lit: "Lithuanian",
  lav: "Latvian",
  est: "Estonian",
  ben: "Bengali",
  tam: "Tamil",
  tel: "Telugu",
  mar: "Marathi",
  urd: "Urdu",
  fas: "Persian",
};

/**
 * Supported response languages for the per-brand-voice override.
 *
 * Single source of truth — derived from `LANGUAGE_MAP` values so the
 * dropdown the user picks from is exactly the set of languages the
 * detector can emit on a review's `detectedLanguage`. The override is
 * stored as a display-name (e.g. "English"), validated against this set
 * by Zod at the API boundary.
 *
 * Sorted alphabetically for the dropdown.
 */
export const SUPPORTED_RESPONSE_LANGUAGES = Object.values(LANGUAGE_MAP).sort();

// API rate limits
export const RATE_LIMITS = {
  AUTH: {
    REQUESTS: 5,
    WINDOW_SECONDS: 60,
  },
  API: {
    REQUESTS: 60,
    WINDOW_SECONDS: 60,
  },
  AI: {
    REQUESTS: 10,
    WINDOW_SECONDS: 60,
  },
} as const;

// Session configuration
export const SESSION_CONFIG = {
  MAX_AGE_DAYS: 30,
  UPDATE_AGE_DAYS: 1,
} as const;

// Email verification
export const EMAIL_CONFIG = {
  VERIFICATION_EXPIRY_HOURS: 24,
  PASSWORD_RESET_EXPIRY_HOURS: 1,
} as const;

// Support contact
export const SUPPORT_EMAIL = "support@brandsiq.app";
export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;

// MVP Phase 1: Founder's public-facing email address.
//
// This is the address SHOWN to beta prospects (e.g. on the expired-invite-link
// recovery page) and used as the destination for founder-inquiry notifications
// in iteration 2.
//
// Distinct from FOUNDER_EMAILS (env var): that is the founder's *identity* —
// the email they log in with to access /dashboard/admin/*. FOUNDER_PUBLIC_EMAIL
// is the address other people write TO when they want to reach the founder.
// In practice these can be different addresses (e.g. login via Gmail, public
// inbox on the brandsiq.app domain).
export const FOUNDER_PUBLIC_EMAIL = "prajeen@brandsiq.app";

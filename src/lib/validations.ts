import { z } from "zod";
import {
  PLATFORMS,
  SENTIMENTS,
  RESPONSE_TONES,
  VALIDATION_LIMITS,
  INDUSTRIES,
  BUSINESS_TYPES,
  BUSINESS_TYPES_BY_INDUSTRY,
  COUNTRIES,
  SIGNUP_INTENTS,
  FOUNDER_INQUIRY_TYPES,
  FOUNDER_INQUIRY_SOURCES,
  // Brand voice redesign V2
  BRAND_VOICE_TONES_V2,
  DEFAULT_BRAND_VOICE_TONE_V2,
  NEGATIVE_REVIEW_FRAMINGS,
  DEFAULT_NEGATIVE_REVIEW_FRAMING,
  BRAND_VOICE_LIMITS_V2,
  SUPPORTED_RESPONSE_LANGUAGES,
  type Industry,
} from "./constants";

// Cross-field check: businessType must belong to the chosen industry. Used
// by both the onboarding and settings schemas via superRefine. When industry
// is "Other" the businessType cascade is hidden in the UI and the value is
// expected to be null/undefined — we don't enforce a match in that case.
//
// Callers pass the partial-update flag because the rules differ:
//   - onboarding: businessType is REQUIRED when industry is not "Other"
//   - settings:   businessType is OPTIONAL (partial update), but if both
//                 industry and businessType are provided they must match
function refineIndustryBusinessTypePair(
  data: { industry?: string | null; businessType?: string | null },
  ctx: z.RefinementCtx,
  options: { requireBusinessType: boolean },
): void {
  const industry = data.industry as Industry | null | undefined;
  const businessType = data.businessType;

  // Nothing to check if industry isn't provided.
  if (!industry) return;

  // "Other" industry: no cascade. businessType must be empty.
  if (industry === "Other") {
    if (businessType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["businessType"],
        message: "Business type is not valid when industry is Other",
      });
    }
    return;
  }

  // Industry has a cascade. businessType (when present) must be in the list.
  const allowed = BUSINESS_TYPES_BY_INDUSTRY[industry] ?? [];
  if (businessType) {
    if (!(allowed as readonly string[]).includes(businessType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["businessType"],
        message: "Selected business type is not valid for the chosen industry",
      });
    }
    return;
  }

  // businessType missing. Only the onboarding schema treats this as an error.
  if (options.requireBusinessType) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["businessType"],
      message: "Please select a business type",
    });
  }
}

/**
 * Zod validation schemas for BrandsIQ
 */

// Auth schemas
export const signUpSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .max(VALIDATION_LIMITS.EMAIL_MAX, "Email is too long"),
  password: z
    .string()
    .min(VALIDATION_LIMITS.PASSWORD_MIN, `Password must be at least ${VALIDATION_LIMITS.PASSWORD_MIN} characters`)
    .max(VALIDATION_LIMITS.PASSWORD_MAX, "Password is too long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  name: z
    .string()
    .min(1, "Name is required")
    .max(VALIDATION_LIMITS.NAME_MAX, "Name is too long"),
  // MVP Phase 1: optional beta invite code. If valid, user is created with
  // isBetaUser=true and beta plan allocation. See MVP.md Section 13.2.
  betaCode: z.string().min(1).max(64).optional(),
});

export const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z
    .string()
    .min(VALIDATION_LIMITS.PASSWORD_MIN, `Password must be at least ${VALIDATION_LIMITS.PASSWORD_MIN} characters`)
    .max(VALIDATION_LIMITS.PASSWORD_MAX, "Password is too long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
});

// Review schemas
export const createReviewSchema = z.object({
  platform: z.enum(PLATFORMS, {
    message: "Please select a valid platform",
  }),
  reviewText: z
    .string()
    .min(VALIDATION_LIMITS.REVIEW_TEXT_MIN, "Review text is required")
    .max(VALIDATION_LIMITS.REVIEW_TEXT_MAX, `Review text must be under ${VALIDATION_LIMITS.REVIEW_TEXT_MAX} characters`),
  rating: z.number().min(1).max(5).optional().nullable(),
  reviewerName: z.string().max(100).optional().nullable(),
  // Accept both date (YYYY-MM-DD) and datetime formats
  reviewDate: z.string().refine(
    (val) => !val || /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/.test(val),
    { message: "Invalid date format" }
  ).optional().nullable(),
  detectedLanguage: z.string().optional(),
});

export const updateReviewSchema = z.object({
  platform: z.enum(PLATFORMS).optional(),
  reviewText: z
    .string()
    .min(VALIDATION_LIMITS.REVIEW_TEXT_MIN)
    .max(VALIDATION_LIMITS.REVIEW_TEXT_MAX)
    .optional(),
  rating: z.number().min(1).max(5).optional().nullable(),
  reviewerName: z.string().max(100).optional().nullable(),
  // Accept both date (YYYY-MM-DD) and datetime formats
  reviewDate: z.string().refine(
    (val) => !val || /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/.test(val),
    { message: "Invalid date format" }
  ).optional().nullable(),
  detectedLanguage: z.string().optional(),
});

// Response schemas
//
// Iter 6 note: these two schemas reference the legacy `RESPONSE_TONES` enum
// for historical compatibility. The actual generate/regenerate route
// handlers use their own inline Zod schemas at the route layer
// (`src/app/api/reviews/[id]/{generate,regenerate}/route.ts`), and the
// regenerate route's inline schema now validates the V2 4-key set per
// spec §8.1. These exports remain as type fixtures for tests and
// downstream consumers that depend on the legacy shape; flip to the V2
// key set in a follow-up if/when call sites move over.
export const generateResponseSchema = z.object({
  reviewId: z.string().cuid("Invalid review ID"),
  tone: z.enum(RESPONSE_TONES).optional().default("professional"),
});

export const regenerateResponseSchema = z.object({
  responseId: z.string().cuid("Invalid response ID"),
  tone: z.enum(RESPONSE_TONES),
});

export const updateResponseSchema = z.object({
  responseText: z
    .string()
    .min(1, "Response text is required")
    .max(VALIDATION_LIMITS.RESPONSE_TEXT_MAX, `Response must be under ${VALIDATION_LIMITS.RESPONSE_TEXT_MAX} characters`),
});

// Brand voice schemas
export const brandVoiceSchema = z.object({
  tone: z.enum(["professional", "friendly", "casual", "empathetic"], {
    message: "Please select a valid tone",
  }),
  formality: z.number().min(1, "Formality must be at least 1").max(5, "Formality must be at most 5"),
  keyPhrases: z.array(z.string().max(100, "Key phrase too long")).max(20, "Maximum 20 key phrases").optional().default([]),
  styleNotes: z.string().max(500, "Style notes must be under 500 characters").optional().nullable(),
  sampleResponses: z.array(z.string().max(500, "Sample response too long")).max(5, "Maximum 5 sample responses").optional().default([]),
});

// Test brand voice schema (for testing with sample review)
export const testBrandVoiceSchema = z.object({
  reviewText: z
    .string()
    .min(VALIDATION_LIMITS.REVIEW_TEXT_MIN, "Review text is required")
    .max(VALIDATION_LIMITS.REVIEW_TEXT_MAX, "Review text too long"),
  platform: z.enum(PLATFORMS).optional().default("Google"),
  rating: z.number().min(1).max(5).optional().nullable(),
});

// ─── Brand voice redesign V2 (iter 2) ──────────────────────────────
// Spec: docs/MVP_Phase-1/BRAND_VOICE_REDESIGN.md §9.2.
//
// V2 is unit-tested and exported now, but NOT yet wired into the API
// routes — the brand-voice GET/PUT continue to validate via the legacy
// `brandVoiceSchema` until iteration 6 swaps them over. This lets us
// land the schema contract independently of the schema reset (iter 3),
// the prompt rewrite (iter 4), and the form rewrite (iter 6).
//
// Key deviation from spec §9.2: `tone` uses the stable lowercase key set
// from BRAND_VOICE_TONES_V2 instead of the display strings the spec
// literally shows. Display labels are looked up via BRAND_VOICE_TONE_INFO_V2.
// Rationale: DECISIONS row #39+ in DECISIONS.md, plan decision 2.

const sampleResponseV2Schema = z.object({
  ratingContext: z.union([
    z.number().int().min(1).max(5),
    z.literal("any"),
  ]),
  responseText: z
    .string()
    .min(1, "Sample response cannot be empty")
    .max(
      BRAND_VOICE_LIMITS_V2.SAMPLE_RESPONSE_MAX,
      `Sample response must be under ${BRAND_VOICE_LIMITS_V2.SAMPLE_RESPONSE_MAX} characters`,
    )
    .transform((s) => s.trim()),
});

export const brandVoiceSchemaV2 = z.object({
  tone: z.enum(BRAND_VOICE_TONES_V2, {
    message: "Please select a valid tone",
  }),

  styleGuidelines: z
    .array(
      z
        .string()
        .min(1, "Style guideline cannot be empty")
        .max(
          BRAND_VOICE_LIMITS_V2.STYLE_GUIDELINE_ITEM_MAX,
          `Each style guideline must be under ${BRAND_VOICE_LIMITS_V2.STYLE_GUIDELINE_ITEM_MAX} characters`,
        )
        .transform((s) => s.trim()),
    )
    .max(
      BRAND_VOICE_LIMITS_V2.STYLE_GUIDELINES_MAX_ITEMS,
      `Maximum ${BRAND_VOICE_LIMITS_V2.STYLE_GUIDELINES_MAX_ITEMS} style guidelines`,
    )
    .default([])
    .refine(
      (arr) => arr.join("\n").length <= BRAND_VOICE_LIMITS_V2.STYLE_GUIDELINES_TOTAL_MAX,
      `Style guidelines total must be under ${BRAND_VOICE_LIMITS_V2.STYLE_GUIDELINES_TOTAL_MAX} characters`,
    ),

  keyPhrases: z
    .array(
      z
        .string()
        .min(1, "Key phrase cannot be empty")
        .max(
          BRAND_VOICE_LIMITS_V2.KEY_PHRASE_MAX,
          `Each key phrase must be under ${BRAND_VOICE_LIMITS_V2.KEY_PHRASE_MAX} characters`,
        )
        .transform((s) => s.trim()),
    )
    .max(
      BRAND_VOICE_LIMITS_V2.KEY_PHRASES_MAX_ITEMS,
      `Maximum ${BRAND_VOICE_LIMITS_V2.KEY_PHRASES_MAX_ITEMS} key phrases`,
    )
    .default([]),

  sampleResponses: z
    .array(sampleResponseV2Schema)
    .max(
      BRAND_VOICE_LIMITS_V2.SAMPLE_RESPONSES_MAX_ITEMS,
      `Maximum ${BRAND_VOICE_LIMITS_V2.SAMPLE_RESPONSES_MAX_ITEMS} sample responses`,
    )
    .default([]),

  acknowledgeNamedStaff: z.boolean().default(true),
  acknowledgeOccasions: z.boolean().default(true),

  salutationPattern: z
    .string()
    .max(
      BRAND_VOICE_LIMITS_V2.SALUTATION_MAX,
      `Salutation must be under ${BRAND_VOICE_LIMITS_V2.SALUTATION_MAX} characters`,
    )
    .transform((s) => s.trim())
    .default("Dear {firstName},"),

  signoffLines: z
    .string()
    .max(
      BRAND_VOICE_LIMITS_V2.SIGNOFF_MAX,
      `Sign-off must be under ${BRAND_VOICE_LIMITS_V2.SIGNOFF_MAX} characters`,
    )
    .transform((s) => s.trim())
    .default("Warmest regards,\nThe Team"),

  negativeReviewEmailEnabled: z.boolean().default(false),

  negativeReviewFraming: z
    .enum(NEGATIVE_REVIEW_FRAMINGS)
    .default(DEFAULT_NEGATIVE_REVIEW_FRAMING),

  negativeReviewFramingCustom: z
    .string()
    .max(
      BRAND_VOICE_LIMITS_V2.FRAMING_CUSTOM_MAX,
      `Custom framing must be under ${BRAND_VOICE_LIMITS_V2.FRAMING_CUSTOM_MAX} characters`,
    )
    .transform((s) => s.trim())
    .optional()
    .nullable(),

  // RFC-compliant + explicit reject of CR/LF (header-injection hardening
  // per spec §7.5) + per-RFC max length of 254 chars.
  replyToEmail: z
    .string()
    .email("Please enter a valid email address")
    .max(
      BRAND_VOICE_LIMITS_V2.REPLY_TO_EMAIL_MAX,
      `Email must be under ${BRAND_VOICE_LIMITS_V2.REPLY_TO_EMAIL_MAX} characters`,
    )
    .refine((v) => !v.includes("\n") && !v.includes("\r"), {
      message: "Email cannot contain line breaks",
    })
    .optional()
    .nullable(),

  // Response language override. Null = follow the review's detected
  // language (default). Non-null must be one of the display-names in
  // SUPPORTED_RESPONSE_LANGUAGES (derived from LANGUAGE_MAP). Bounded at
  // the column-level cap; the refine guards against arbitrary strings
  // that would pass the length check.
  responseLanguage: z
    .string()
    .max(
      BRAND_VOICE_LIMITS_V2.RESPONSE_LANGUAGE_MAX,
      `Response language must be under ${BRAND_VOICE_LIMITS_V2.RESPONSE_LANGUAGE_MAX} characters`,
    )
    .refine((v) => (SUPPORTED_RESPONSE_LANGUAGES as readonly string[]).includes(v), {
      message: "Unsupported response language",
    })
    .optional()
    .nullable(),

  // 5/30 — language the user typed their `salutationPattern` and
  // `signoffLines` in. Detected via franc in the form (debounced over
  // the combined salutation + sign-off string) and overridable via the
  // inline "Change" indicator. Same value-set and length cap as
  // `responseLanguage`. Null when franc returned "und" and the user
  // didn't manually confirm — the resolver uses system defaults in that
  // case. See DECISIONS.md #107.
  salutationSignoffLanguage: z
    .string()
    .max(
      BRAND_VOICE_LIMITS_V2.RESPONSE_LANGUAGE_MAX,
      `Salutation/sign-off language must be under ${BRAND_VOICE_LIMITS_V2.RESPONSE_LANGUAGE_MAX} characters`,
    )
    .refine((v) => (SUPPORTED_RESPONSE_LANGUAGES as readonly string[]).includes(v), {
      message: "Unsupported salutation/sign-off language",
    })
    .optional()
    .nullable(),
});

export type BrandVoiceInputV2 = z.infer<typeof brandVoiceSchemaV2>;

// Re-export the default tone key so the schema and downstream consumers
// agree without a second source of truth.
export { DEFAULT_BRAND_VOICE_TONE_V2 };

// User profile schemas
// MVP Phase 1 onboarding wizard: collects org/industry/country/location info
// per MVP.md Section 9. All mandatory fields are required at the route layer
// for the onboarding submission (this schema describes the *shape* of a PATCH
// — caller decides which subset is required for which flow).
export const updateProfileSchema = z.object({
  // Existing field (kept for backward compat with any caller that just wants
  // to update display name).
  name: z.string().min(1).max(VALIDATION_LIMITS.NAME_MAX).optional(),

  // Onboarding-mandatory fields. The route enforces presence; the schema
  // allows partial updates so a future "edit profile" flow can update one
  // field at a time without re-submitting everything.
  organizationName: z.string().min(1).max(VALIDATION_LIMITS.ORGANIZATION_NAME_MAX).optional(),
  industry: z.enum(INDUSTRIES).optional(),
  businessType: z.enum(BUSINESS_TYPES).optional().nullable(),
  country: z.enum(COUNTRIES).optional(),
  locationName: z.string().min(1).max(VALIDATION_LIMITS.LOCATION_NAME_MAX).optional(),

  // Onboarding-optional fields.
  locationCountEstimate: z
    .number()
    .int()
    .min(1)
    .max(VALIDATION_LIMITS.LOCATION_COUNT_MAX)
    .optional()
    .nullable(),
  primaryPlatform: z.enum(PLATFORMS).optional().nullable(),

  // Direct (no-beta-invite) signups only. If signupIntent is set and the
  // user is not on the beta plan, the route creates a FounderInquiry of
  // type beta_request with source=onboarding_intent.
  signupIntent: z.enum(SIGNUP_INTENTS).optional().nullable(),
  signupChallengeText: z
    .string()
    .max(VALIDATION_LIMITS.SIGNUP_CHALLENGE_TEXT_MAX)
    .optional()
    .nullable(),
});

// /dashboard/settings/profile partial-update schema. Used by the settings
// page's autosave flow (PATCH /api/user/settings/profile). All fields are
// optional — the client sends only the changed field. The server enforces
// non-empty strings via z.string().min(1) for fields that are conceptually
// required overall (name, organizationName, industry, country, locationName);
// they just don't all have to arrive in the same request.
export const settingsProfileUpdateSchema = z
  .object({
    name: z
      .string()
      .min(1, "Display name is required")
      .max(VALIDATION_LIMITS.NAME_MAX, "Display name is too long")
      .optional(),
    organizationName: z
      .string()
      .min(1, "Organization name is required")
      .max(VALIDATION_LIMITS.ORGANIZATION_NAME_MAX, "Organization name is too long")
      .optional(),
    industry: z.enum(INDUSTRIES).optional(),
    // businessType is the second-level cascade. Allowed to be null when
    // industry is "Other" (no cascade) or when the user has cleared it.
    // superRefine below enforces that the value matches the industry.
    businessType: z.enum(BUSINESS_TYPES).optional().nullable(),
    country: z.enum(COUNTRIES).optional(),
    // Edits the user's single Location row's name. Empty string is rejected —
    // the form should hide the field rather than send a clearing update.
    locationName: z
      .string()
      .min(1, "Location name is required")
      .max(VALIDATION_LIMITS.LOCATION_NAME_MAX, "Location name is too long")
      .optional(),
    locationCountEstimate: z
      .number()
      .int()
      .min(1)
      .max(VALIDATION_LIMITS.LOCATION_COUNT_MAX)
      .optional()
      .nullable(),
    primaryPlatform: z.enum(PLATFORMS).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No fields to update",
  })
  .superRefine((data, ctx) => {
    refineIndustryBusinessTypePair(data, ctx, { requireBusinessType: false });
  });

// Onboarding-specific schema with the mandatory fields actually required.
// Used by the /onboarding form submit; the broader updateProfileSchema is
// what a future "edit profile" surface would use.
export const onboardingSubmitSchema = z
  .object({
    organizationName: z.string().min(1, "Organization name is required").max(VALIDATION_LIMITS.ORGANIZATION_NAME_MAX),
    industry: z.enum(INDUSTRIES, { message: "Please select an industry" }),
    // businessType is required when industry isn't "Other" (superRefine
    // enforces). Sent as null/undefined when industry is "Other"; the UI
    // hides the second dropdown in that case.
    businessType: z.enum(BUSINESS_TYPES).optional().nullable(),
    country: z.enum(COUNTRIES, { message: "Please select a country" }),
    locationName: z.string().min(1, "Location name is required").max(VALIDATION_LIMITS.LOCATION_NAME_MAX),
    locationCountEstimate: z
      .number()
      .int()
      .min(1)
      .max(VALIDATION_LIMITS.LOCATION_COUNT_MAX)
      .optional()
      .nullable(),
    primaryPlatform: z.enum(PLATFORMS).optional().nullable(),
    signupIntent: z.enum(SIGNUP_INTENTS).optional().nullable(),
    signupChallengeText: z
      .string()
      .max(VALIDATION_LIMITS.SIGNUP_CHALLENGE_TEXT_MAX)
      .optional()
      .nullable(),
  })
  .superRefine((data, ctx) => {
    refineIndustryBusinessTypePair(data, ctx, { requireBusinessType: true });
  });

// MVP Phase 1 founder-inquiry schemas. See MVP.md Section 13.4.
// The form is used in four places (expired-link recovery, pricing-page CTA,
// zero-balance dialog for Free + Beta users, onboarding-intent). The submission
// is the same shape regardless of source; type + source are how we tell them
// apart server-side.
export const createFounderInquirySchema = z.object({
  type: z.enum(FOUNDER_INQUIRY_TYPES),
  source: z.enum(FOUNDER_INQUIRY_SOURCES).optional(),
  // Submitter contact — required when the form is submitted from a pre-signup
  // surface (expired-link page), optional when submitted by a signed-in user
  // (we'll fall back to session info). Schema allows both; route enforces.
  submitterName: z.string().max(VALIDATION_LIMITS.NAME_MAX).optional().nullable(),
  submitterEmail: z.string().email().max(VALIDATION_LIMITS.EMAIL_MAX).optional().nullable(),
  businessName: z.string().max(VALIDATION_LIMITS.INQUIRY_BUSINESS_NAME_MAX).optional().nullable(),
  message: z.string().min(1, "Please tell us a bit about your request").max(VALIDATION_LIMITS.INQUIRY_MESSAGE_MAX),
});

// Founder marking an inquiry as resolved with notes.
export const resolveFounderInquirySchema = z.object({
  founderNotes: z.string().max(VALIDATION_LIMITS.FOUNDER_NOTES_MAX).optional().nullable(),
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// Filter schemas
export const reviewFiltersSchema = z.object({
  platform: z.enum(PLATFORMS).optional(),
  sentiment: z.enum(SENTIMENTS).optional(),
  hasResponse: z.boolean().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().max(100).optional(),
});

// Type exports
export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type GenerateResponseInput = z.infer<typeof generateResponseSchema>;
export type RegenerateResponseInput = z.infer<typeof regenerateResponseSchema>;
export type UpdateResponseInput = z.infer<typeof updateResponseSchema>;
export type BrandVoiceInput = z.infer<typeof brandVoiceSchema>;
export type TestBrandVoiceInput = z.infer<typeof testBrandVoiceSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type OnboardingSubmitInput = z.infer<typeof onboardingSubmitSchema>;
export type SettingsProfileUpdateInput = z.infer<typeof settingsProfileUpdateSchema>;
export type CreateFounderInquiryInput = z.infer<typeof createFounderInquirySchema>;
export type ResolveFounderInquiryInput = z.infer<typeof resolveFounderInquirySchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type ReviewFiltersInput = z.infer<typeof reviewFiltersSchema>;

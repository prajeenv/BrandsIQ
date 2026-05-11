import { z } from "zod";
import {
  PLATFORMS,
  SENTIMENTS,
  RESPONSE_TONES,
  VALIDATION_LIMITS,
  INDUSTRIES,
  COUNTRIES,
  SIGNUP_INTENTS,
  FOUNDER_INQUIRY_TYPES,
  FOUNDER_INQUIRY_SOURCES,
} from "./constants";

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
  reviewText: z.string().min(1, "Review text is required").max(2000, "Review text too long"),
  platform: z.enum(PLATFORMS).optional().default("Google"),
  rating: z.number().min(1).max(5).optional().nullable(),
});

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

// Onboarding-specific schema with the mandatory fields actually required.
// Used by the /onboarding form submit; the broader updateProfileSchema is
// what a future "edit profile" surface would use.
export const onboardingSubmitSchema = z.object({
  organizationName: z.string().min(1, "Organization name is required").max(VALIDATION_LIMITS.ORGANIZATION_NAME_MAX),
  industry: z.enum(INDUSTRIES, { message: "Please select an industry" }),
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
export type CreateFounderInquiryInput = z.infer<typeof createFounderInquirySchema>;
export type ResolveFounderInquiryInput = z.infer<typeof resolveFounderInquirySchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type ReviewFiltersInput = z.infer<typeof reviewFiltersSchema>;

import { z } from "zod";
import { PLATFORMS, SENTIMENTS, RESPONSE_TONES, VALIDATION_LIMITS } from "./constants";

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
export const updateProfileSchema = z.object({
  name: z.string().min(1).max(VALIDATION_LIMITS.NAME_MAX).optional(),
  businessName: z.string().max(200).optional().nullable(),
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
export type PaginationInput = z.infer<typeof paginationSchema>;
export type ReviewFiltersInput = z.infer<typeof reviewFiltersSchema>;

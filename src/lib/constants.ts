/**
 * Application constants for BrandsIQ
 */

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

// Credit costs
export const CREDIT_COSTS = {
  GENERATE_RESPONSE: 1.0,
  REGENERATE_RESPONSE: 1.0,
} as const;

// Validation limits
export const VALIDATION_LIMITS = {
  REVIEW_TEXT_MIN: 1,
  REVIEW_TEXT_MAX: 2000,
  RESPONSE_TEXT_MAX: 500,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 100,
  NAME_MAX: 100,
  EMAIL_MAX: 255,
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

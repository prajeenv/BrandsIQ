-- Add a per-brand-voice "salutation/sign-off language" column that records
-- what language the user typed their `salutationPattern` and `signoffLines`
-- in. Detected automatically via franc in the form (debounced on the
-- combined salutation + sign-off string) and overridable via an inline
-- "Change" affordance — mirrors the review-creation form's language
-- detection UX.
--
-- At assembly time, the post-processor compares this against the response's
-- `effectiveLanguage` to decide whether to use the user's literal
-- customisation or a built-in default from LANGUAGE_DEFAULT_CONTACT_BLOCK
-- (src/lib/ai/language-contact-defaults.ts). Match → user's text;
-- mismatch → system default. Null → system default (the user's text is
-- unused; the "Language unclear" form indicator warns about this).
--
-- Two-step migration:
--   1. ADD COLUMN as nullable varchar(50) — additive, safe.
--   2. Backfill every existing row to 'English'. The pre-this-PR experience
--      always treated the salutation/sign-off as English (the column didn't
--      exist; the resolver hadn't been written), so this preserves the
--      old behaviour for English responses. After this point, the only
--      way a row carries NULL is if the user types a fresh customisation
--      that franc returns "und" on AND they don't manually confirm via
--      the indicator.
--
-- No CHECK constraint: the supported-language set lives in TypeScript
-- (`SUPPORTED_RESPONSE_LANGUAGES` in `src/lib/constants.ts`) and is
-- validated by Zod at the API boundary. Same pattern as response_language.

ALTER TABLE "brand_voices"
  ADD COLUMN "salutation_signoff_language" varchar(50);

UPDATE "brand_voices"
  SET "salutation_signoff_language" = 'English'
  WHERE "salutation_signoff_language" IS NULL;

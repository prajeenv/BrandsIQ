-- Add a per-brand-voice "response language" override that pins the AI's
-- response language to a fixed value regardless of the review's detected
-- language. Null (default) preserves current behaviour — the response is
-- written in the review's detected language. Non-null is a display-name
-- from the LANGUAGE_MAP values (e.g. "English", "Spanish") matching the
-- shape already used by `reviews.detected_language`.
--
-- No CHECK constraint: the supported-language set lives in TypeScript
-- (`SUPPORTED_RESPONSE_LANGUAGES` in `src/lib/constants.ts`) and is
-- validated by Zod at the API boundary. Same approach used for
-- `reply_to_email` — DB column is a bounded string, Zod owns the
-- semantic validation.
--
-- Nullable + additive — no backfill needed, no risk to existing rows.

ALTER TABLE "brand_voices"
  ADD COLUMN "response_language" varchar(50);

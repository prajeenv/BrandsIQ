-- Persist the per-regeneration "Additional instructions" the user typed
-- into the regenerate dialog. Two columns, both nullable, both `text` so
-- they accept the Zod-capped 500-char input without any DB-level cap of
-- their own.
--
-- `review_responses.additionalInstructions`     — the instruction that
--   produced the CURRENT live response. Null on initial generation, null
--   after manual edits, non-null only when the latest action was a
--   regenerate with the dialog's textarea filled in.
--
-- `response_versions.additionalInstructions`    — snapshot of the field
--   archived alongside the response that produced an older row. Lets the
--   version-history UI surface "what did the user type to produce this
--   older response?".
--
-- Both columns are nullable + additive — no data backfill, no DB-level
-- constraint, no risk to existing rows.

ALTER TABLE "review_responses"
  ADD COLUMN "additionalInstructions" text;

ALTER TABLE "response_versions"
  ADD COLUMN "additionalInstructions" text;

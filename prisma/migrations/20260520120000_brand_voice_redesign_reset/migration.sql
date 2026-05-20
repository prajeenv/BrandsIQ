-- Brand voice redesign iteration 3: clean-reset migration to the V2 shape.
--
-- See docs/MVP_Phase-1/BRAND_VOICE_REDESIGN.md §4–§7, §9.1.
-- See DECISIONS.md "Brand Voice Page Redesign" / Iteration 3 entry.
--
-- This is a DESTRUCTIVE migration: it TRUNCATEs brand_voices + reviews +
-- review_responses + response_versions before applying the schema change.
--
-- This is intentional and approved:
--   - The system is pre-launch. All rows in these tables are throwaway
--     test data the user explicitly confirmed they were happy to delete.
--   - `getOrCreateBrandVoice()` lazily recreates a default brand_voices
--     row for each user on their next dashboard read, so no manual
--     re-seeding is required.
--   - Doing TRUNCATE + schema-change in a single transaction is safer
--     than parse-or-default data migration over JSON.stringify text →
--     JSONB array, the (since-removed) `styleNotes` text column with
--     the headline JSON-render bug.
--
-- The constraint-name strings are conservative: any constraint Postgres
-- auto-named earlier (e.g. tone DEFAULT) is dropped via ALTER ... DROP
-- DEFAULT and re-applied by the new column DEFAULT clause. The CHECK
-- constraints below name themselves so they're stable across deploys.

BEGIN;

-- Clear all rows in the tables we're reshaping. `reviews` and its dependent
-- response/version tables are truncated too because (a) the existing rows
-- reference brand-voice-shaped generation and may not assemble correctly
-- under the new prompt+post-processing pipeline that lands in iter 4/5,
-- and (b) all are throwaway test data.
TRUNCATE TABLE
  "response_versions",
  "review_responses",
  "reviews",
  "brand_voices"
RESTART IDENTITY CASCADE;

-- ─── brand_voices: drop legacy columns ────────────────────────────────
ALTER TABLE "brand_voices" DROP COLUMN "formality";
ALTER TABLE "brand_voices" DROP COLUMN "styleNotes";
ALTER TABLE "brand_voices" DROP COLUMN "sampleResponses";

-- ─── brand_voices: rename surviving column to match Prisma @map ───────
ALTER TABLE "brand_voices" RENAME COLUMN "keyPhrases" TO "key_phrases";

-- ─── brand_voices: add V2 columns with safe defaults ──────────────────
-- Tone default flips from the legacy "professional" to the V2 key.
ALTER TABLE "brand_voices" ALTER COLUMN "tone" SET DEFAULT 'friendly_professional';

-- styleGuidelines: JSONB array of strings (max 10 items, 200 chars each
-- per item, 2000 chars joined total — enforced in Zod, not SQL).
ALTER TABLE "brand_voices"
  ADD COLUMN "style_guidelines" jsonb NOT NULL DEFAULT '[]'::jsonb;

-- sampleResponses: JSONB array of objects {ratingContext, responseText}.
-- Schema enforced in Zod (sampleResponseV2Schema in src/lib/validations.ts).
ALTER TABLE "brand_voices"
  ADD COLUMN "sample_responses" jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Personalization toggles (spec §6).
ALTER TABLE "brand_voices"
  ADD COLUMN "acknowledge_named_staff" boolean NOT NULL DEFAULT true,
  ADD COLUMN "acknowledge_occasions" boolean NOT NULL DEFAULT true;

-- Contact & sign-off (spec §7). Salutation and sign-off are never sent
-- to the model — they're applied during post-processing in iter 5.
ALTER TABLE "brand_voices"
  ADD COLUMN "salutation_pattern" varchar(100) NOT NULL DEFAULT 'Dear {firstName},',
  ADD COLUMN "signoff_lines" text NOT NULL DEFAULT E'Warmest regards,\nThe Team';

-- Negative-review email invitation (spec §7.3 / §7.4 / §7.5).
-- Opt-in (default OFF). Framing is an enum-as-string with CHECK below.
ALTER TABLE "brand_voices"
  ADD COLUMN "negative_review_email_enabled" boolean NOT NULL DEFAULT false,
  ADD COLUMN "negative_review_framing" varchar(32) NOT NULL DEFAULT 'investigation',
  ADD COLUMN "negative_review_framing_custom" text,
  ADD COLUMN "reply_to_email" varchar(254);

-- ─── brand_voices: CHECK constraints ──────────────────────────────────
-- Database-level guards for the enum-as-string columns. Zod also enforces
-- these, but the DB constraint is defense-in-depth: any raw SQL or future
-- direct DB write can't accidentally introduce a bad value.

ALTER TABLE "brand_voices"
  ADD CONSTRAINT "brand_voices_tone_check"
  CHECK ("tone" IN ('warm_casual', 'friendly_professional', 'polished_formal', 'empathetic_attentive'));

ALTER TABLE "brand_voices"
  ADD CONSTRAINT "brand_voices_negative_review_framing_check"
  CHECK ("negative_review_framing" IN ('management_contact', 'investigation', 'open_channel', 'custom'));

-- ─── Post-condition guard ─────────────────────────────────────────────
-- Make the migration fail loudly if any of the truncates didn't take —
-- precondition for the rest of the redesign assuming a clean slate.
DO $$
DECLARE
  bv_count   integer;
  rev_count  integer;
  resp_count integer;
  ver_count  integer;
BEGIN
  SELECT COUNT(*) INTO bv_count   FROM "brand_voices";
  SELECT COUNT(*) INTO rev_count  FROM "reviews";
  SELECT COUNT(*) INTO resp_count FROM "review_responses";
  SELECT COUNT(*) INTO ver_count  FROM "response_versions";
  IF bv_count > 0 OR rev_count > 0 OR resp_count > 0 OR ver_count > 0 THEN
    RAISE EXCEPTION
      'Aborting: clean-reset expected all four tables empty after TRUNCATE, found brand_voices=%, reviews=%, review_responses=%, response_versions=%',
      bv_count, rev_count, resp_count, ver_count;
  END IF;
END $$;

COMMIT;

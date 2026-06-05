-- Make Review.reviewText optional (nullable).
--
-- Context: a star-only review (e.g. a Google "5 stars, no comment") has no
-- written text. The application now requires a rating on create and treats
-- review text as optional. See DECISIONS.md (review-text-optional) +
-- docs/MVP_Phase-1 / CORE_SPECS.
--
-- This is a purely additive relaxation (DROP NOT NULL). Existing rows all
-- carry text, so no backfill is needed and there is no "contract" half --
-- we are loosening the constraint, not tightening it.

ALTER TABLE "reviews" ALTER COLUMN "reviewText" DROP NOT NULL;

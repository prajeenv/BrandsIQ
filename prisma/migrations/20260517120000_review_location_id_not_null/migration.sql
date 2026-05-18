-- Iteration 3 PR 3b: contract step of the expand->backfill->contract
-- migration for Review.locationId.
--
--   expand   (iter 1)  add nullable locationId + backfill script
--   backfill (iter 1)  scripts/backfill-locations.ts
--   fix      (iter 3a)  POST /api/reviews always sets locationId
--   contract (iter 3b)  this migration: enforce NOT NULL
--
-- Safe because: PR 3a is live on staging + prod (every new review gets a
-- locationId), the iter-1 backfill + a staging UPDATE cleared all pre-
-- existing nulls, and `SELECT COUNT(*) FROM reviews WHERE "locationId" IS
-- NULL` returns 0 on BOTH staging and production. A guard SELECT below
-- aborts the migration loudly if that assumption is ever false at apply
-- time (e.g. a stray null slipped in between verification and deploy)
-- rather than letting Postgres emit a less obvious constraint error.

DO $$
DECLARE
  null_count integer;
BEGIN
  SELECT COUNT(*) INTO null_count FROM "reviews" WHERE "locationId" IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION
      'Aborting: % review row(s) still have a NULL locationId. Backfill them before applying the NOT NULL constraint (see iteration 3 PR 3a/3b).',
      null_count;
  END IF;
END $$;

-- AlterTable: enforce the contract.
ALTER TABLE "reviews" ALTER COLUMN "locationId" SET NOT NULL;

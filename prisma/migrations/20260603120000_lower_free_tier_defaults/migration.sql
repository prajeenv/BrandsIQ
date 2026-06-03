-- Lower the FREE tier's default credit allocation from 15/35 to 5/25.
--
-- After reviewing real-business review volumes, the FREE allocation was
-- judged too generous to function as a trial-to-paid funnel. FREE exists to
-- drive upgrades, not to be a viable indefinite plan, so the response credits
-- drop 15 -> 5 and the sentiment credits drop 35 -> 25.
--
-- These are COLUMN DEFAULTS only. Application code (auth.ts signIn event,
-- signup route) always sets the explicit allocation via
-- `getEffectiveAllocation()` / `TIER_LIMITS.FREE`, so the @default is a
-- fallback for direct DB inserts. Kept in sync with the constant for
-- correctness. No data backfill — there are no real users, only test users,
-- which reset to 5/25 on their next anniversary cron run.
--
-- STARTER, GROWTH, and the BETA plan (a flag, not a column default) are
-- unchanged.

ALTER TABLE "users"
  ALTER COLUMN "credits" SET DEFAULT 5;

ALTER TABLE "users"
  ALTER COLUMN "sentimentCredits" SET DEFAULT 25;

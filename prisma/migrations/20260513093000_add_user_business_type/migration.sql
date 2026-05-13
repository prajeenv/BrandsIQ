-- AlterTable: add nullable businessType column on users
-- See docs/MVP_Phase-1/Business Universe.md for the closed-set values.
-- Two-level cascade with industry (existing column).
ALTER TABLE "users" ADD COLUMN "businessType" TEXT;

-- Brand voice redesign iteration 1: add SecurityLog table.
--
-- Records non-blocking detections of suspicious patterns in user-supplied
-- text that flows into AI prompts (review text, brand voice fields,
-- regenerate instructions). Logging only — never blocks save or generation.
-- See docs/MVP_Phase-1/BRAND_VOICE_REDESIGN.md §10.6.
--
-- Brand-new additive table; no DO $$ guard needed. Safe to apply migration-
-- first because no existing code references it.

CREATE TABLE "security_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "eventType" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "matchedPatterns" TEXT[],
    "preview" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "security_logs_userId_createdAt_idx" ON "security_logs"("userId", "createdAt");
CREATE INDEX "security_logs_eventType_idx" ON "security_logs"("eventType");

ALTER TABLE "security_logs"
    ADD CONSTRAINT "security_logs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

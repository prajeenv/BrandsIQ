-- AlterTable
ALTER TABLE "users" ADD COLUMN     "country" TEXT,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "isBetaUser" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "locationCountEstimate" INTEGER,
ADD COLUMN     "organizationName" TEXT,
ADD COLUMN     "primaryPlatform" TEXT,
ADD COLUMN     "signupChallengeText" TEXT,
ADD COLUMN     "signupIntent" TEXT;
-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "locationId" TEXT;
-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "beta_invite_links" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedByUserId" TEXT,
    CONSTRAINT "beta_invite_links_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "founder_inquiries" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "source" TEXT,
    "submitterName" TEXT,
    "submitterEmail" TEXT,
    "businessName" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "founderNotes" TEXT,
    CONSTRAINT "founder_inquiries_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "locations_userId_idx" ON "locations"("userId");
-- CreateIndex
CREATE UNIQUE INDEX "beta_invite_links_code_key" ON "beta_invite_links"("code");
-- CreateIndex
CREATE INDEX "beta_invite_links_code_idx" ON "beta_invite_links"("code");
-- CreateIndex
CREATE INDEX "beta_invite_links_usedByUserId_idx" ON "beta_invite_links"("usedByUserId");
-- CreateIndex
CREATE INDEX "founder_inquiries_type_resolvedAt_idx" ON "founder_inquiries"("type", "resolvedAt");
-- CreateIndex
CREATE INDEX "founder_inquiries_userId_idx" ON "founder_inquiries"("userId");
-- CreateIndex
CREATE INDEX "users_isBetaUser_idx" ON "users"("isBetaUser");
-- CreateIndex
CREATE INDEX "reviews_locationId_idx" ON "reviews"("locationId");
-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "beta_invite_links" ADD CONSTRAINT "beta_invite_links_usedByUserId_fkey" FOREIGN KEY ("usedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "founder_inquiries" ADD CONSTRAINT "founder_inquiries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

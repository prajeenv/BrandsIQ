/**
 * One-shot backfill: every existing User gets a "Default Location"; every
 * existing Review gets locationId set to that location.
 *
 * See docs/MVP_Phase-1/MVP.md Section 13.12.
 *
 * Run on staging-clone first. Verify counts. Then run on prod.
 *
 *   npx tsx scripts/backfill-locations.ts            # dry run (default)
 *   npx tsx scripts/backfill-locations.ts --apply    # write changes
 *
 * The script is idempotent: re-running after a successful apply is a no-op
 * because every User already has a Location and every Review already has a
 * locationId. Safe to retry on partial failures.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply");
const DEFAULT_LOCATION_NAME = "Default Location";

async function main() {
  console.log(`Backfill mode: ${APPLY ? "APPLY (writing changes)" : "DRY RUN"}\n`);

  // 1. Find every user that doesn't have at least one Location.
  const usersNeedingLocation = await prisma.user.findMany({
    where: { locations: { none: {} } },
    select: { id: true, email: true, _count: { select: { reviews: true } } },
  });

  console.log(`Users without a Location: ${usersNeedingLocation.length}`);
  if (usersNeedingLocation.length > 0) {
    console.log("Sample (first 5):");
    for (const u of usersNeedingLocation.slice(0, 5)) {
      console.log(`  - ${u.email} (${u._count.reviews} reviews)`);
    }
  }

  // 2. Find reviews with no locationId.
  const reviewsWithoutLocation = await prisma.review.count({
    where: { locationId: null },
  });
  console.log(`\nReviews without locationId: ${reviewsWithoutLocation}\n`);

  if (!APPLY) {
    console.log("Dry run complete. Re-run with --apply to write changes.");
    return;
  }

  // 3. Apply: per user, create Default Location and link their reviews.
  let usersProcessed = 0;
  let reviewsLinked = 0;
  const errors: string[] = [];

  for (const user of usersNeedingLocation) {
    try {
      await prisma.$transaction(async (tx) => {
        const location = await tx.location.create({
          data: {
            userId: user.id,
            name: DEFAULT_LOCATION_NAME,
          },
        });

        const updated = await tx.review.updateMany({
          where: { userId: user.id, locationId: null },
          data: { locationId: location.id },
        });

        reviewsLinked += updated.count;
      });
      usersProcessed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`User ${user.id} (${user.email}): ${msg}`);
    }
  }

  // 4. Sweep: any orphan reviews whose user already had a location but the
  // review wasn't linked (shouldn't happen in normal flow; handles edge cases
  // like a user with ONE existing location plus orphan reviews).
  const orphanReviews = await prisma.review.findMany({
    where: { locationId: null },
    select: { id: true, userId: true },
  });

  if (orphanReviews.length > 0) {
    console.log(`\nFound ${orphanReviews.length} orphan reviews after primary backfill — linking to existing user locations...`);
    for (const review of orphanReviews) {
      try {
        const location = await prisma.location.findFirst({
          where: { userId: review.userId },
          orderBy: { createdAt: "asc" },
          select: { id: true },
        });
        if (location) {
          await prisma.review.update({
            where: { id: review.id },
            data: { locationId: location.id },
          });
          reviewsLinked++;
        } else {
          errors.push(`Orphan review ${review.id}: user ${review.userId} has no location`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`Orphan review ${review.id}: ${msg}`);
      }
    }
  }

  console.log(`\nDone.`);
  console.log(`  Users processed: ${usersProcessed}/${usersNeedingLocation.length}`);
  console.log(`  Reviews linked: ${reviewsLinked}`);
  if (errors.length > 0) {
    console.log(`  Errors: ${errors.length}`);
    for (const e of errors) console.log(`    - ${e}`);
    process.exitCode = 1;
  }

  // 5. Final assertion.
  const remaining = await prisma.review.count({ where: { locationId: null } });
  if (remaining > 0) {
    console.log(`\n⚠️  ${remaining} reviews still without locationId. Investigate before iteration 3 contract migration.`);
    process.exitCode = 1;
  } else {
    console.log(`\n✅ All reviews now have locationId.`);
  }
}

main()
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

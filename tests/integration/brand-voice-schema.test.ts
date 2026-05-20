/**
 * Brand voice redesign iter 3: integration tests for the V2 schema and the
 * CHECK constraints added by the clean-reset migration.
 *
 * Runs against real PostgreSQL in CI. Confirms:
 *   - A default brand_voices row can be created with V2 column defaults
 *   - styleGuidelines / sampleResponses accept the new JSONB shapes
 *   - The tone CHECK constraint rejects out-of-set values
 *   - The negative_review_framing CHECK constraint rejects out-of-set values
 *
 * Spec: docs/MVP_Phase-1/BRAND_VOICE_REDESIGN.md §9.1, DECISIONS row 50+.
 */
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { getTestPrisma, cleanDatabase, disconnectPrisma, createTestUser } from "./helpers";

const canRunIntegration = !!process.env.DATABASE_URL?.includes("localhost");

describe.skipIf(!canRunIntegration)("BrandVoice V2 schema (Integration)", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  it("creates a default brand voice with V2 column defaults", async () => {
    const db = getTestPrisma();
    const user = await createTestUser();

    const bv = await db.brandVoice.create({
      data: {
        userId: user.id,
        // Everything else takes the column DEFAULT.
      },
    });

    expect(bv.tone).toBe("friendly_professional");
    expect(bv.keyPhrases).toEqual([]);
    expect(bv.styleGuidelines).toEqual([]);
    expect(bv.sampleResponses).toEqual([]);
    expect(bv.acknowledgeNamedStaff).toBe(true);
    expect(bv.acknowledgeOccasions).toBe(true);
    expect(bv.salutationPattern).toBe("Dear {firstName},");
    expect(bv.signoffLines).toBe("Warmest regards,\nThe Team");
    expect(bv.negativeReviewEmailEnabled).toBe(false);
    expect(bv.negativeReviewFraming).toBe("investigation");
    expect(bv.negativeReviewFramingCustom).toBeNull();
    expect(bv.replyToEmail).toBeNull();
  });

  it("accepts a full V2 payload including JSONB arrays of objects", async () => {
    const db = getTestPrisma();
    const user = await createTestUser();

    const bv = await db.brandVoice.create({
      data: {
        userId: user.id,
        tone: "polished_formal",
        keyPhrases: ["Thank you for choosing us"],
        styleGuidelines: ["Mirror specific details", "For negative reviews, take ownership"],
        sampleResponses: [
          { ratingContext: 5, responseText: "What a wonderful visit to be part of." },
          { ratingContext: "any", responseText: "Thanks so much for sharing this." },
        ],
        acknowledgeNamedStaff: false,
        acknowledgeOccasions: true,
        salutationPattern: "Hi {firstName},",
        signoffLines: "With thanks,\nThe Manager",
        negativeReviewEmailEnabled: true,
        negativeReviewFraming: "management_contact",
        negativeReviewFramingCustom: null,
        replyToEmail: "hello@brand.example",
      },
    });

    expect(bv.tone).toBe("polished_formal");
    expect(bv.styleGuidelines).toEqual([
      "Mirror specific details",
      "For negative reviews, take ownership",
    ]);
    expect(bv.sampleResponses).toEqual([
      { ratingContext: 5, responseText: "What a wonderful visit to be part of." },
      { ratingContext: "any", responseText: "Thanks so much for sharing this." },
    ]);
    expect(bv.acknowledgeNamedStaff).toBe(false);
    expect(bv.negativeReviewEmailEnabled).toBe(true);
    expect(bv.replyToEmail).toBe("hello@brand.example");
  });

  it("rejects an out-of-set tone via the CHECK constraint", async () => {
    const db = getTestPrisma();
    const user = await createTestUser();

    // `prisma.brandVoice.create` with a string value uses Prisma's
    // generated type which is `String`, so the runtime hits the DB CHECK.
    await expect(
      db.brandVoice.create({
        data: {
          userId: user.id,
          tone: "aggressive",
        },
      }),
    ).rejects.toThrow();
  });

  it("rejects an out-of-set negative_review_framing via the CHECK constraint", async () => {
    const db = getTestPrisma();
    const user = await createTestUser();

    await expect(
      db.brandVoice.create({
        data: {
          userId: user.id,
          negativeReviewFraming: "apologetic", // not in the allowed set
        },
      }),
    ).rejects.toThrow();
  });

  it("preserves brand_voices on user-deletion cascade behaviour (Cascade)", async () => {
    const db = getTestPrisma();
    const user = await createTestUser();

    await db.brandVoice.create({
      data: { userId: user.id },
    });

    const beforeCount = await db.brandVoice.count({ where: { userId: user.id } });
    expect(beforeCount).toBe(1);

    await db.user.delete({ where: { id: user.id } });

    // Brand voice cascades on user deletion (same as before the redesign).
    const afterCount = await db.brandVoice.count();
    expect(afterCount).toBe(0);
  });
});

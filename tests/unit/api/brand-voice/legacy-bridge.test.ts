/**
 * Iter 3 ⇄ iter 6 bridge tests.
 *
 * The bridge is the only thing keeping the (unchanged) brand voice form
 * working between the iter 3 DB cutover and the iter 6 form rewrite, so
 * the round-trips it implements get explicit coverage here. Iter 6 will
 * delete `_legacy-bridge.ts` and this test file together.
 */
import { describe, it, expect } from "vitest";
import {
  fromLegacyForm,
  legacyToneToV2,
  parseLegacyStyleNotes,
  serialiseStyleGuidelinesForLegacy,
  toLegacyShape,
  v2ToneToLegacy,
  type V2BrandVoiceRow,
} from "@/app/api/brand-voice/_legacy-bridge";

const baseRow: V2BrandVoiceRow = {
  id: "bv1",
  tone: "friendly_professional",
  keyPhrases: ["Thank you"],
  styleGuidelines: ["Be genuine"],
  sampleResponses: [
    { ratingContext: "any", responseText: "Thanks!" },
    { ratingContext: 5, responseText: "Five-star reply" },
  ],
  acknowledgeNamedStaff: true,
  acknowledgeOccasions: true,
  salutationPattern: "Dear {firstName},",
  signoffLines: "Warmest regards,\nThe Team",
  negativeReviewEmailEnabled: false,
  negativeReviewFraming: "investigation",
  negativeReviewFramingCustom: null,
  replyToEmail: null,
  createdAt: new Date("2026-05-20T12:00:00Z"),
  updatedAt: new Date("2026-05-20T12:00:00Z"),
};

describe("legacyToneToV2", () => {
  it("maps every legacy lowercase tone key to a V2 key", () => {
    expect(legacyToneToV2("friendly")).toBe("friendly_professional");
    expect(legacyToneToV2("professional")).toBe("friendly_professional");
    expect(legacyToneToV2("casual")).toBe("warm_casual");
    expect(legacyToneToV2("formal")).toBe("polished_formal");
    expect(legacyToneToV2("empathetic")).toBe("empathetic_attentive");
  });

  it("passes V2 keys through unchanged", () => {
    expect(legacyToneToV2("warm_casual")).toBe("warm_casual");
    expect(legacyToneToV2("friendly_professional")).toBe("friendly_professional");
  });

  it("falls back to the default V2 key for unknown values", () => {
    expect(legacyToneToV2("aggressive")).toBe("friendly_professional");
  });
});

describe("v2ToneToLegacy", () => {
  it("maps V2 → legacy for the four V2 keys", () => {
    expect(v2ToneToLegacy("warm_casual")).toBe("casual");
    expect(v2ToneToLegacy("friendly_professional")).toBe("professional");
    expect(v2ToneToLegacy("polished_formal")).toBe("professional"); // no legacy `formal` in BRAND_VOICE_TONES
    expect(v2ToneToLegacy("empathetic_attentive")).toBe("empathetic");
  });

  it("falls back to 'professional' on unknown V2 keys", () => {
    expect(v2ToneToLegacy("garbage")).toBe("professional");
  });
});

describe("parseLegacyStyleNotes", () => {
  it("parses a JSON-stringified array (the legacy form's save format)", () => {
    expect(parseLegacyStyleNotes(JSON.stringify(["A", "B"]))).toEqual(["A", "B"]);
  });

  it("falls back to newline-split for older non-JSON values", () => {
    expect(parseLegacyStyleNotes("Rule one\nRule two")).toEqual(["Rule one", "Rule two"]);
  });

  it("drops empty / whitespace-only entries", () => {
    expect(parseLegacyStyleNotes(JSON.stringify(["A", "", "  ", "B"]))).toEqual(["A", "B"]);
  });

  it("trims surrounding whitespace", () => {
    expect(parseLegacyStyleNotes(JSON.stringify(["  trim me  "]))).toEqual(["trim me"]);
  });

  it("returns empty array on null/undefined/empty input", () => {
    expect(parseLegacyStyleNotes(null)).toEqual([]);
    expect(parseLegacyStyleNotes(undefined)).toEqual([]);
    expect(parseLegacyStyleNotes("")).toEqual([]);
  });

  it("handles malformed JSON without throwing", () => {
    expect(() => parseLegacyStyleNotes('["unterminated')).not.toThrow();
  });
});

describe("serialiseStyleGuidelinesForLegacy", () => {
  it("returns a JSON.stringified array on the way back to the form", () => {
    expect(serialiseStyleGuidelinesForLegacy(["A", "B"])).toBe('["A","B"]');
  });

  it("returns null for an empty array (form treats absence as 'no rules')", () => {
    expect(serialiseStyleGuidelinesForLegacy([])).toBeNull();
  });

  it("round-trips with parseLegacyStyleNotes", () => {
    const original = ["Rule one", "Rule two"];
    const serialised = serialiseStyleGuidelinesForLegacy(original);
    expect(parseLegacyStyleNotes(serialised)).toEqual(original);
  });
});

describe("fromLegacyForm", () => {
  it("maps tone via legacyToneToV2", () => {
    const out = fromLegacyForm({ tone: "casual", formality: 3 });
    expect(out.tone).toBe("warm_casual");
  });

  it("parses styleNotes into styleGuidelines string[]", () => {
    const out = fromLegacyForm({
      tone: "professional",
      formality: 3,
      styleNotes: JSON.stringify(["A", "B"]),
    });
    expect(out.styleGuidelines).toEqual(["A", "B"]);
  });

  it("wraps sampleResponses string[] as objects with ratingContext='any'", () => {
    const out = fromLegacyForm({
      tone: "professional",
      formality: 3,
      sampleResponses: ["First", "Second"],
    });
    expect(out.sampleResponses).toEqual([
      { ratingContext: "any", responseText: "First" },
      { ratingContext: "any", responseText: "Second" },
    ]);
  });

  it("drops empty / whitespace-only sample responses defensively", () => {
    const out = fromLegacyForm({
      tone: "professional",
      formality: 3,
      sampleResponses: ["Real", "", "  ", "Also real"],
    });
    expect(out.sampleResponses.map((s) => s.responseText)).toEqual(["Real", "Also real"]);
  });

  it("defaults missing keyPhrases / styleNotes / sampleResponses to empty/[]", () => {
    const out = fromLegacyForm({ tone: "professional", formality: 3 });
    expect(out.keyPhrases).toEqual([]);
    expect(out.styleGuidelines).toEqual([]);
    expect(out.sampleResponses).toEqual([]);
  });

  it("ignores `formality` (the column is dropped)", () => {
    const out = fromLegacyForm({ tone: "professional", formality: 9 });
    // No assertion on a non-existent field; just confirm the call doesn't
    // throw and the V2 payload is well-formed.
    expect(out.tone).toBe("friendly_professional");
  });
});

describe("toLegacyShape", () => {
  it("maps V2 tone → legacy tone for the form's selector", () => {
    expect(toLegacyShape(baseRow).tone).toBe("professional"); // friendly_professional → professional
  });

  it("stubs formality at 3 (column is dropped; legacy form needs a value)", () => {
    expect(toLegacyShape(baseRow).formality).toBe(3);
  });

  it("re-serialises styleGuidelines as the legacy JSON-stringified styleNotes", () => {
    expect(toLegacyShape(baseRow).styleNotes).toBe(JSON.stringify(["Be genuine"]));
  });

  it("returns null styleNotes when the V2 styleGuidelines array is empty", () => {
    const row: V2BrandVoiceRow = { ...baseRow, styleGuidelines: [] };
    expect(toLegacyShape(row).styleNotes).toBeNull();
  });

  it("flattens V2 sampleResponses objects to legacy string[] via responseText", () => {
    expect(toLegacyShape(baseRow).sampleResponses).toEqual(["Thanks!", "Five-star reply"]);
  });

  it("survives a non-array JSONB column (e.g. corrupted row) by returning []", () => {
    const row: V2BrandVoiceRow = {
      ...baseRow,
      styleGuidelines: { not: "an array" } as unknown as V2BrandVoiceRow["styleGuidelines"],
      sampleResponses: "garbage" as unknown as V2BrandVoiceRow["sampleResponses"],
    };
    const out = toLegacyShape(row);
    expect(out.styleNotes).toBeNull();
    expect(out.sampleResponses).toEqual([]);
  });

  it("preserves keyPhrases unchanged (same column type as before)", () => {
    expect(toLegacyShape(baseRow).keyPhrases).toEqual(["Thank you"]);
  });

  it("returns timestamps as ISO 8601 strings", () => {
    const out = toLegacyShape(baseRow);
    expect(out.createdAt).toBe("2026-05-20T12:00:00.000Z");
    expect(out.updatedAt).toBe("2026-05-20T12:00:00.000Z");
  });
});

describe("round-trip", () => {
  it("legacy form payload → fromLegacyForm → V2 column write → toLegacyShape returns equivalent legacy shape", () => {
    // The form sends this:
    const legacyIn = {
      tone: "casual",
      formality: 2,
      keyPhrases: ["Thanks!", "Cheers"],
      styleNotes: JSON.stringify(["Be playful"]),
      sampleResponses: ["Sample one"],
    };

    // Bridge converts to V2 writes:
    const v2Write = fromLegacyForm(legacyIn);

    // Simulate the row that comes back from prisma.upsert:
    const dbRow: V2BrandVoiceRow = {
      ...baseRow,
      tone: v2Write.tone,
      keyPhrases: v2Write.keyPhrases,
      styleGuidelines: v2Write.styleGuidelines,
      sampleResponses: v2Write.sampleResponses,
    };

    // Project back to the legacy shape the form expects:
    const legacyOut = toLegacyShape(dbRow);

    expect(legacyOut.tone).toBe(legacyIn.tone); // casual → warm_casual → casual ✓
    expect(legacyOut.keyPhrases).toEqual(legacyIn.keyPhrases);
    expect(legacyOut.styleNotes).toBe(legacyIn.styleNotes);
    expect(legacyOut.sampleResponses).toEqual(legacyIn.sampleResponses);
  });
});

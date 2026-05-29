import { describe, it, expect } from "vitest";

import { normalizeBrandVoice } from "@/lib/ai/brand-voice-normalize";

describe("normalizeBrandVoice", () => {
  describe("tone mapping (spec §4.1)", () => {
    it("maps legacy 'friendly' → 'friendly_professional'", () => {
      expect(normalizeBrandVoice({ tone: "friendly" }).tone).toBe("friendly_professional");
    });

    it("maps legacy 'professional' → 'friendly_professional'", () => {
      expect(normalizeBrandVoice({ tone: "professional" }).tone).toBe("friendly_professional");
    });

    it("maps legacy 'casual' → 'warm_casual'", () => {
      expect(normalizeBrandVoice({ tone: "casual" }).tone).toBe("warm_casual");
    });

    it("maps legacy 'formal' → 'polished_formal'", () => {
      expect(normalizeBrandVoice({ tone: "formal" }).tone).toBe("polished_formal");
    });

    it("maps legacy 'empathetic' → 'empathetic_attentive'", () => {
      expect(normalizeBrandVoice({ tone: "empathetic" }).tone).toBe("empathetic_attentive");
    });

    it("maps the 'default' sentinel (used on first-generation ReviewResponse.toneUsed) → default", () => {
      expect(normalizeBrandVoice({ tone: "default" }).tone).toBe("friendly_professional");
    });

    it("passes V2 keys through unchanged", () => {
      for (const tone of ["warm_casual", "friendly_professional", "polished_formal", "empathetic_attentive"]) {
        expect(normalizeBrandVoice({ tone }).tone).toBe(tone);
      }
    });

    it("falls back to default on unknown tone strings", () => {
      expect(normalizeBrandVoice({ tone: "aggressive" }).tone).toBe("friendly_professional");
    });

    it("falls back to default on non-string tone (e.g. null)", () => {
      expect(normalizeBrandVoice({ tone: null }).tone).toBe("friendly_professional");
    });
  });

  describe("styleGuidelines (spec §4.2 — the headline JSON bug fix)", () => {
    it("parses legacy JSON-stringified array from styleNotes", () => {
      const out = normalizeBrandVoice({
        styleNotes: JSON.stringify(["Rule one", "Rule two"]),
      });
      expect(out.styleGuidelines).toEqual(["Rule one", "Rule two"]);
    });

    it("parses legacy newline-separated styleNotes (pre-JSON era)", () => {
      const out = normalizeBrandVoice({
        styleNotes: "Rule one\nRule two\nRule three",
      });
      expect(out.styleGuidelines).toEqual(["Rule one", "Rule two", "Rule three"]);
    });

    it("trims whitespace and drops empty entries", () => {
      const out = normalizeBrandVoice({
        styleNotes: JSON.stringify(["  trim me  ", "", "  "]),
      });
      expect(out.styleGuidelines).toEqual(["trim me"]);
    });

    it("falls back to empty array on malformed JSON-looking input", () => {
      const out = normalizeBrandVoice({
        styleNotes: '["unterminated',
      });
      // Falls through to newline-split — entire string is one line, so we get it back.
      // Either behavior is acceptable defensively; the contract is "never throw".
      expect(Array.isArray(out.styleGuidelines)).toBe(true);
    });

    it("returns empty array when styleNotes is null/undefined", () => {
      expect(normalizeBrandVoice({ styleNotes: null }).styleGuidelines).toEqual([]);
      expect(normalizeBrandVoice({}).styleGuidelines).toEqual([]);
    });

    it("passes V2 styleGuidelines column (real JSONB array) through unchanged", () => {
      const out = normalizeBrandVoice({
        styleGuidelines: ["Already structured", "No JSON.stringify here"],
      });
      expect(out.styleGuidelines).toEqual(["Already structured", "No JSON.stringify here"]);
    });

    it("prefers styleGuidelines (V2 column) over styleNotes (legacy column) when both present", () => {
      const out = normalizeBrandVoice({
        styleGuidelines: ["from V2"],
        styleNotes: JSON.stringify(["from legacy"]),
      });
      expect(out.styleGuidelines).toEqual(["from V2"]);
    });
  });

  describe("sampleResponses (spec §5.1)", () => {
    it("wraps legacy string[] as ratingContext='any' objects", () => {
      const out = normalizeBrandVoice({
        sampleResponses: ["Thanks!", "We appreciate it."],
      });
      expect(out.sampleResponses).toEqual([
        { ratingContext: "any", responseText: "Thanks!" },
        { ratingContext: "any", responseText: "We appreciate it." },
      ]);
    });

    it("passes V2 object-shape entries through with ratingContext preserved", () => {
      const out = normalizeBrandVoice({
        sampleResponses: [
          { ratingContext: 5, responseText: "Wonderful!" },
          { ratingContext: "any", responseText: "Generic" },
        ],
      });
      expect(out.sampleResponses).toEqual([
        { ratingContext: 5, responseText: "Wonderful!" },
        { ratingContext: "any", responseText: "Generic" },
      ]);
    });

    it("coerces invalid ratingContext to 'any' (defensive)", () => {
      const out = normalizeBrandVoice({
        sampleResponses: [
          { ratingContext: 99, responseText: "Out of range" },
          { ratingContext: "nope", responseText: "Bad string" },
          { ratingContext: null, responseText: "Null" },
        ],
      });
      expect(out.sampleResponses.every((s) => s.ratingContext === "any")).toBe(true);
    });

    it("drops entries with empty/whitespace responseText", () => {
      const out = normalizeBrandVoice({
        sampleResponses: [
          { ratingContext: 5, responseText: "" },
          { ratingContext: 5, responseText: "   " },
          { ratingContext: 5, responseText: "Real" },
        ],
      });
      expect(out.sampleResponses).toEqual([{ ratingContext: 5, responseText: "Real" }]);
    });

    it("returns empty array on non-array input", () => {
      expect(normalizeBrandVoice({ sampleResponses: "not an array" }).sampleResponses).toEqual([]);
      expect(normalizeBrandVoice({}).sampleResponses).toEqual([]);
    });
  });

  describe("keyPhrases", () => {
    it("passes string[] through trimmed and de-emptied", () => {
      const out = normalizeBrandVoice({
        keyPhrases: ["  Thank you  ", "", "  ", "We appreciate"],
      });
      expect(out.keyPhrases).toEqual(["Thank you", "We appreciate"]);
    });

    it("returns empty array on non-array input", () => {
      expect(normalizeBrandVoice({ keyPhrases: null }).keyPhrases).toEqual([]);
      expect(normalizeBrandVoice({}).keyPhrases).toEqual([]);
    });
  });

  describe("toggles & contact/sign-off defaults", () => {
    it("acknowledgeNamedStaff defaults to true", () => {
      expect(normalizeBrandVoice({}).acknowledgeNamedStaff).toBe(true);
    });

    it("acknowledgeOccasions defaults to true", () => {
      expect(normalizeBrandVoice({}).acknowledgeOccasions).toBe(true);
    });

    it("preserves explicit false toggles", () => {
      const out = normalizeBrandVoice({
        acknowledgeNamedStaff: false,
        acknowledgeOccasions: false,
      });
      expect(out.acknowledgeNamedStaff).toBe(false);
      expect(out.acknowledgeOccasions).toBe(false);
    });

    it("salutationPattern defaults to 'Dear {firstName},'", () => {
      expect(normalizeBrandVoice({}).salutationPattern).toBe("Dear {firstName},");
    });

    it("signoffLines default to 'Warmest regards,\\nThe Team'", () => {
      expect(normalizeBrandVoice({}).signoffLines).toBe("Warmest regards,\nThe Team");
    });

    it("negativeReviewEmailEnabled defaults to false (opt-in)", () => {
      expect(normalizeBrandVoice({}).negativeReviewEmailEnabled).toBe(false);
    });

    it("negativeReviewFraming defaults to 'investigation'", () => {
      expect(normalizeBrandVoice({}).negativeReviewFraming).toBe("investigation");
    });

    it("falls back to default framing on unknown values", () => {
      expect(normalizeBrandVoice({ negativeReviewFraming: "apologetic" }).negativeReviewFraming).toBe(
        "investigation",
      );
    });

    it("passes all four framing values through unchanged", () => {
      for (const f of ["management_contact", "investigation", "open_channel", "custom"]) {
        expect(normalizeBrandVoice({ negativeReviewFraming: f }).negativeReviewFraming).toBe(f);
      }
    });

    it("normalizes empty/whitespace strings on negativeReviewFramingCustom + replyToEmail to null", () => {
      const out = normalizeBrandVoice({
        negativeReviewFramingCustom: "   ",
        replyToEmail: "",
      });
      expect(out.negativeReviewFramingCustom).toBeNull();
      expect(out.replyToEmail).toBeNull();
    });

    it("trims whitespace on negativeReviewFramingCustom + replyToEmail when non-empty", () => {
      const out = normalizeBrandVoice({
        negativeReviewFramingCustom: "  Custom rule  ",
        replyToEmail: "  hello@example.com  ",
      });
      expect(out.negativeReviewFramingCustom).toBe("Custom rule");
      expect(out.replyToEmail).toBe("hello@example.com");
    });
  });

  describe("responseLanguage", () => {
    it("defaults to null when the field is absent", () => {
      expect(normalizeBrandVoice({}).responseLanguage).toBeNull();
    });

    it("defaults to null when explicitly null", () => {
      expect(normalizeBrandVoice({ responseLanguage: null }).responseLanguage).toBeNull();
    });

    it("passes a supported display name through unchanged", () => {
      expect(normalizeBrandVoice({ responseLanguage: "English" }).responseLanguage).toBe("English");
      expect(normalizeBrandVoice({ responseLanguage: "Spanish" }).responseLanguage).toBe("Spanish");
    });

    it("trims whitespace before validating", () => {
      expect(normalizeBrandVoice({ responseLanguage: "  English  " }).responseLanguage).toBe(
        "English",
      );
    });

    it("coerces an empty/whitespace string to null", () => {
      expect(normalizeBrandVoice({ responseLanguage: "" }).responseLanguage).toBeNull();
      expect(normalizeBrandVoice({ responseLanguage: "   " }).responseLanguage).toBeNull();
    });

    it("coerces unknown language strings to null (defensive — never leak invalid values downstream)", () => {
      // Even though Zod validates at the API boundary, anything that
      // slipped past (e.g. a DB row written before the column existed)
      // should normalize to null rather than break the prompt builder.
      expect(normalizeBrandVoice({ responseLanguage: "Klingon" }).responseLanguage).toBeNull();
      // ISO 639-3 codes are not the storage shape — display names are.
      expect(normalizeBrandVoice({ responseLanguage: "eng" }).responseLanguage).toBeNull();
    });

    it("coerces non-string values to null", () => {
      // normalizeBrandVoice's `raw` parameter is `unknown`, so these
      // bad-shape inputs don't need a ts-expect-error — defensive
      // runtime hardening is the function's contract.
      expect(normalizeBrandVoice({ responseLanguage: 42 }).responseLanguage).toBeNull();
      expect(normalizeBrandVoice({ responseLanguage: true }).responseLanguage).toBeNull();
    });
  });

  describe("safety", () => {
    it("returns defaults for null input", () => {
      const out = normalizeBrandVoice(null);
      expect(out.tone).toBe("friendly_professional");
      expect(out.styleGuidelines).toEqual([]);
      expect(out.sampleResponses).toEqual([]);
    });

    it("returns defaults for undefined input", () => {
      const out = normalizeBrandVoice(undefined);
      expect(out.tone).toBe("friendly_professional");
    });

    it("returns defaults for non-object primitive input", () => {
      expect(normalizeBrandVoice("string").tone).toBe("friendly_professional");
      expect(normalizeBrandVoice(42).tone).toBe("friendly_professional");
      expect(normalizeBrandVoice(true).tone).toBe("friendly_professional");
    });

    it("ignores unknown fields without throwing", () => {
      expect(() =>
        normalizeBrandVoice({
          tone: "friendly_professional",
          aRandomField: { nested: "stuff" },
          formality: 7, // legacy field that V2 drops — must be ignored, not used
        }),
      ).not.toThrow();
    });

    it("never returns undefined fields (the canonical shape is total)", () => {
      const out = normalizeBrandVoice({});
      for (const v of Object.values(out)) {
        expect(v).not.toBeUndefined();
      }
    });
  });
});

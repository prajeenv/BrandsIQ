import { describe, it, expect } from "vitest";

import {
  getFramingFragment,
  getStructureTemplate,
  isNegativeReview,
  NAMED_STAFF_FRAGMENT,
  OCCASION_FRAGMENT,
  selectStructureTemplate,
  UNIVERSAL_STRUCTURAL_RULES,
} from "@/lib/ai/structure-templates";

describe("selectStructureTemplate (spec §9.5 routing)", () => {
  it("returns 'positive' for a 5-star review with no sentiment", () => {
    expect(selectStructureTemplate({ rating: 5, sentiment: null })).toBe("positive");
  });

  it("returns 'positive' for a 5-star review with positive sentiment", () => {
    expect(selectStructureTemplate({ rating: 5, sentiment: "positive" })).toBe("positive");
  });

  it("returns 'positive' for a 4-star review with positive sentiment", () => {
    expect(selectStructureTemplate({ rating: 4, sentiment: "positive" })).toBe("positive");
  });

  it("returns 'mixed' for a 3-star review", () => {
    expect(selectStructureTemplate({ rating: 3, sentiment: null })).toBe("mixed");
  });

  it("returns 'mixed' for a 3-star review with positive sentiment (rating wins)", () => {
    expect(selectStructureTemplate({ rating: 3, sentiment: "positive" })).toBe("mixed");
  });

  it("returns 'mixed' for a 4-star review with mixed sentiment", () => {
    expect(selectStructureTemplate({ rating: 4, sentiment: "mixed" })).toBe("mixed");
  });

  it("returns 'mixed' for a 5-star review with mixed sentiment", () => {
    expect(selectStructureTemplate({ rating: 5, sentiment: "mixed" })).toBe("mixed");
  });

  it("returns 'negative' for a 2-star review", () => {
    expect(selectStructureTemplate({ rating: 2, sentiment: null })).toBe("negative");
  });

  it("returns 'negative' for a 1-star review", () => {
    expect(selectStructureTemplate({ rating: 1, sentiment: null })).toBe("negative");
  });

  // The "Kiran case" — spec §9.5 explicitly calls this out.
  it("returns 'negative' for a 4-star review with negative sentiment (the 'Kiran case')", () => {
    expect(selectStructureTemplate({ rating: 4, sentiment: "negative" })).toBe("negative");
  });

  it("returns 'negative' for any rating when sentiment is explicitly 'negative'", () => {
    expect(selectStructureTemplate({ rating: 5, sentiment: "negative" })).toBe("negative");
  });

  it("returns 'positive' as the safe default when rating is null and sentiment is unknown", () => {
    expect(selectStructureTemplate({ rating: null, sentiment: null })).toBe("positive");
    expect(selectStructureTemplate({ rating: undefined, sentiment: undefined })).toBe("positive");
  });
});

describe("isNegativeReview", () => {
  it("delegates to selectStructureTemplate (single source of truth)", () => {
    // Reuse the same routing predicate so iter 5's post-processing fires
    // the reply-to-email rule on exactly the same set of reviews as the
    // prompt picks the negative template for.
    expect(isNegativeReview({ rating: 1, sentiment: null })).toBe(true);
    expect(isNegativeReview({ rating: 4, sentiment: "negative" })).toBe(true);
    expect(isNegativeReview({ rating: 3, sentiment: null })).toBe(false);
    expect(isNegativeReview({ rating: 5, sentiment: "positive" })).toBe(false);
  });
});

describe("getStructureTemplate", () => {
  it("returns the positive template body for positive routing", () => {
    const out = getStructureTemplate({ rating: 5, sentiment: null });
    expect(out).toContain("thank the reviewer and acknowledge specific details");
    expect(out).toContain("forward-looking statement inviting them back");
  });

  it("returns the mixed template body for 3-star routing", () => {
    const out = getStructureTemplate({ rating: 3, sentiment: null });
    expect(out).toContain("acknowledge the positives");
    expect(out).toContain("address the specific concerns");
    expect(out).toContain("show ownership");
  });

  it("returns the negative template body for 1-star routing", () => {
    const out = getStructureTemplate({ rating: 1, sentiment: null });
    expect(out).toContain("sincere apology");
    expect(out).toContain("take ownership of the experience");
    expect(out).toContain("management contact / investigation / open channel");
  });

  it("returns the negative template body for the 4-star+negative-sentiment routing", () => {
    const out = getStructureTemplate({ rating: 4, sentiment: "negative" });
    expect(out).toContain("sincere apology");
  });
});

describe("UNIVERSAL_STRUCTURAL_RULES", () => {
  it("includes the 2–4 paragraph requirement", () => {
    expect(UNIVERSAL_STRUCTURAL_RULES).toContain("2–4 short paragraphs");
  });

  it("forbids em-dashes (the single most reliable AI tell)", () => {
    expect(UNIVERSAL_STRUCTURAL_RULES).toContain('No em-dashes');
  });

  it("forbids the AI-giveaway word list", () => {
    const banned = [
      "delve",
      "rest assured",
      "we strive to",
      "tapestry",
      "robust",
      "seamless",
      "leverage",
      "navigate the complexities of",
      "in the realm of",
    ];
    for (const word of banned) {
      expect(UNIVERSAL_STRUCTURAL_RULES).toContain(word);
    }
  });

  it("forbids the opening AI-cliche phrases", () => {
    expect(UNIVERSAL_STRUCTURAL_RULES).toContain('I hope this finds you well');
    expect(UNIVERSAL_STRUCTURAL_RULES).toContain('Thank you for reaching out');
  });

  it("includes the Key-phrases precedence rule", () => {
    expect(UNIVERSAL_STRUCTURAL_RULES).toContain("Key phrases entry takes precedence");
  });

  it("explicitly forbids generating a salutation or sign-off in the body", () => {
    expect(UNIVERSAL_STRUCTURAL_RULES).toContain("Do NOT include a salutation or sign-off");
  });
});

describe("NAMED_STAFF_FRAGMENT", () => {
  it("instructs the model to thank named staff and promise to share feedback", () => {
    expect(NAMED_STAFF_FRAGMENT).toContain("staff member");
    expect(NAMED_STAFF_FRAGMENT).toContain("share the feedback");
  });
});

describe("OCCASION_FRAGMENT", () => {
  it("instructs the model to acknowledge birthdays/anniversaries/first/returning visits", () => {
    expect(OCCASION_FRAGMENT).toContain("birthday");
    expect(OCCASION_FRAGMENT).toContain("anniversary");
    expect(OCCASION_FRAGMENT).toContain("first visit");
    expect(OCCASION_FRAGMENT).toContain("returning visit");
  });
});

describe("getFramingFragment", () => {
  it("returns the management_contact framing string", () => {
    const out = getFramingFragment("management_contact");
    expect(out).toContain("member of management");
    expect(out).toContain("booking details");
  });

  it("returns the investigation framing string (the default/recommended option)", () => {
    const out = getFramingFragment("investigation");
    expect(out).toContain("team would like to look into");
  });

  it("returns the open_channel framing string", () => {
    const out = getFramingFragment("open_channel");
    expect(out).toContain("channel for further conversation");
    // The string explicitly disclaims specific follow-up action: "without
    // promising specific follow-up actions." That's the differentiator vs.
    // management_contact which DOES promise contact.
    expect(out).toContain("without promising");
  });

  it("returns null for 'custom' (handled separately by the caller)", () => {
    expect(getFramingFragment("custom")).toBeNull();
  });

  it("produces measurably different framing strings (spec §12 acceptance criterion)", () => {
    const a = getFramingFragment("management_contact");
    const b = getFramingFragment("investigation");
    const c = getFramingFragment("open_channel");
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
    expect(a).not.toBe(c);
  });
});

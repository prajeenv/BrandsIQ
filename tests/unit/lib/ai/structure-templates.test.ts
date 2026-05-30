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

  // 5/24 prompt-tuning pass — Kiran-case rebalance. Mixed reviews must give
  // the positive and negative content roughly equal space; the older
  // template let positives dominate.
  it("requires the mixed template to give positive + negative content equal weight", () => {
    const out = getStructureTemplate({ rating: 3, sentiment: null });
    expect(out.toLowerCase()).toContain("equal space");
    expect(out.toLowerCase()).toContain("do not bury the criticism");
  });

  it("returns the negative template body for 1-star routing", () => {
    const out = getStructureTemplate({ rating: 1, sentiment: null });
    expect(out).toContain("sincere apology");
    // 5/25 prompt-tuning iter-2: "take ownership of the experience"
    // language replaced with directional "communicate an internal
    // commitment to address what happened" — same intent, framed as
    // behavior the model can apply without inviting self-criticism.
    // The "management contact / investigation / open channel" phrase
    // moved into the closing-paragraph instruction (Change C) where it
    // gates the contact-invitation, but is no longer the headline rule.
    expect(out).toContain("internal commitment to address");
    expect(out.toLowerCase()).toContain("framing instruction above");
  });

  it("returns the negative template body for the 4-star+negative-sentiment routing", () => {
    const out = getStructureTemplate({ rating: 4, sentiment: "negative" });
    expect(out).toContain("sincere apology");
  });

  // 5/24 prompt-tuning pass — specificity requirement on negative reviews.
  // The model must engage with one concrete incident, not abstractions.
  it("requires the negative template to demand one concrete incident reference", () => {
    const out = getStructureTemplate({ rating: 1, sentiment: null });
    expect(out.toLowerCase()).toContain("reference one specific incident");
    expect(out.toLowerCase()).toContain("specificity is required, not optional");
    expect(out.toLowerCase()).toContain("abstractions");
  });

  // Multi-issue trade-off acknowledgment: on a review with many complaints,
  // the model picks one specific incident + a general "and several other
  // concerns" acknowledgment for the rest. This is the trade-off needed to
  // stay within the length target.
  it("acknowledges the multi-issue trade-off on the negative template", () => {
    const out = getStructureTemplate({ rating: 1, sentiment: null });
    expect(out.toLowerCase()).toContain("several other concerns");
  });

  // Anti-self-flagellation register on negative reviews — write as a
  // manager apologising in person, not as a corporate statement.
  it("requires the negative template's register to be 'manager apologising in person'", () => {
    const out = getStructureTemplate({ rating: 1, sentiment: null });
    expect(out.toLowerCase()).toContain("manager apologising in person");
    expect(out.toLowerCase()).toContain("not as a corporate statement");
    expect(out.toLowerCase()).toContain("do not theatrically self-flagellate");
  });

  // 5/25 prompt-tuning iter-2 — Change A. Directional anti-self-criticism
  // rule. Caught the "we should have held service or ensured fresh plates"
  // pattern from the Hema response, plus all the cousins ("we fell short",
  // "let you down", "did not meet our standards").
  it("forbids self-criticism in the negative reply (Change A)", () => {
    const out = getStructureTemplate({ rating: 1, sentiment: null });
    expect(out.toLowerCase()).toContain("do not self-criticise");
    expect(out.toLowerCase()).toContain("do not state what we should have done differently");
    expect(out.toLowerCase()).toContain("do not volunteer operational fixes");
  });

  // 5/25 prompt-tuning iter-2 — Change C (the structural fix). The
  // negative template now distinguishes internal-commitment (universal)
  // from contact-channel (config-gated), and explicitly bans inventing
  // a contact path when no channel is configured.
  it("communicates an internal commitment to address — universal, not config-gated (Change C)", () => {
    const out = getStructureTemplate({ rating: 1, sentiment: null });
    expect(out.toLowerCase()).toContain("internal commitment to address");
    expect(out.toLowerCase()).toContain("universal");
    expect(out.toLowerCase()).toContain("does not depend on whether a contact channel is configured");
  });

  it("bans fabricating a contact channel when none is configured (Change C)", () => {
    const out = getStructureTemplate({ rating: 1, sentiment: null });
    expect(out.toLowerCase()).toContain("if no contact channel is configured");
    expect(out.toLowerCase()).toContain("do not invent a generic");
    expect(out.toLowerCase()).toContain("do not fabricate channels");
  });

  it("requires a hopeful forward-looking close when no contact channel is configured (Change C)", () => {
    const out = getStructureTemplate({ rating: 1, sentiment: null });
    expect(out.toLowerCase()).toContain("hopeful forward-looking statement");
    expect(out.toLowerCase()).toContain("serve them better in the future");
  });

  it("bans ending the negative reply on apology alone (Change C)", () => {
    const out = getStructureTemplate({ rating: 1, sentiment: null });
    expect(out.toLowerCase()).toContain("must not end on the apology");
  });

  // 5/25 prompt-tuning iter-2 follow-up — register-aware contractions.
  // The apology paragraph specifically leans slightly more formal than
  // the brand's usual tone, even when the brand's tone allows
  // contractions. Apologies land with more weight in measured language.
  it("requires the apology paragraph to lean slightly more formal than the brand's usual tone", () => {
    const out = getStructureTemplate({ rating: 1, sentiment: null });
    expect(out.toLowerCase()).toContain("lean slightly more formal");
    expect(out.toLowerCase()).toContain("we are deeply sorry");
    expect(out.toLowerCase()).toContain("we're deeply sorry");
  });
});

describe("UNIVERSAL_STRUCTURAL_RULES", () => {
  // 5/24 prompt-tuning pass — paragraph count tightened from 2–4 to 2–3,
  // and an explicit 500–750 char length target was added so the universal
  // rules carry the floor for length too.
  it("includes the 2–3 paragraph requirement", () => {
    expect(UNIVERSAL_STRUCTURAL_RULES).toContain("2–3 short paragraphs");
  });

  it("targets a response body of 500–750 characters in the universal rules", () => {
    expect(UNIVERSAL_STRUCTURAL_RULES).toContain("between 500 and 750 characters");
  });

  it("forbids em-dashes (the single most reliable AI tell)", () => {
    expect(UNIVERSAL_STRUCTURAL_RULES).toContain('No em-dashes');
  });

  // 5/25 prompt-tuning iter-2 — Change B. Stops the model from echoing
  // back the price the customer paid (the "£700" pattern from the Hema
  // response). Price-echo reads as the brand agreeing "yes you spent a
  // lot — bad value", which is tacky.
  it("bans referencing the price the customer paid back to them (Change B)", () => {
    expect(UNIVERSAL_STRUCTURAL_RULES.toLowerCase()).toContain(
      "do not reference the price the customer paid back to them",
    );
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

  // 5/30 prompt-tuning iter-9 / PR 2 — "Do not promise the failed thing
  // done correctly". Observed in spreadsheet review: the model was
  // closing a 1★ undercooked-pizza reply with "a properly prepared
  // meal in the future" — re-naming the specific failure as part of
  // the hopeful close. This reduces the apology to a sales pitch for
  // the corrected version of the failed thing. The rule lives in the
  // universal block (not the negative template) because the failure
  // mode can surface anywhere: apology paragraph, internal commitment,
  // close, or any other sentence. Same anywhere-in-response scope as
  // the price-echo rule (Change B).
  describe("Do not promise the failed thing done correctly (PR 2)", () => {
    it("introduces the rule by name in the universal block", () => {
      expect(UNIVERSAL_STRUCTURAL_RULES).toContain(
        "Do not promise the failed thing done correctly",
      );
    });

    it("scopes the rule explicitly to anywhere in the response (not close-only)", () => {
      // Anchor on the phrase that makes the scope universal — the lower-
      // case search keeps the test resilient to minor capitalisation
      // edits in the prompt copy.
      expect(UNIVERSAL_STRUCTURAL_RULES.toLowerCase()).toContain(
        "apology paragraph, internal commitment, close",
      );
      expect(UNIVERSAL_STRUCTURAL_RULES.toLowerCase()).toContain(
        "it is not limited to the closing",
      );
    });

    it("names the canonical bad example from the spreadsheet-review symptom", () => {
      // "a properly prepared meal" was the literal output that
      // motivated the rule.
      expect(UNIVERSAL_STRUCTURAL_RULES).toContain(
        '"a properly prepared meal"',
      );
    });

    it("names additional don't-promise-the-fix examples across business types", () => {
      // The example list covers more than one failure shape so the
      // model generalises rather than memorising a single hospitality
      // phrase. Spot-check a representative range.
      const badExamples = [
        "an on-time delivery this time",
        "a booking that's actually honoured",
        "the warm service you should have received",
        "the experience that meets your expectations",
        "the standard our customers expect",
      ];
      for (const example of badExamples) {
        expect(UNIVERSAL_STRUCTURAL_RULES).toContain(example);
      }
    });

    it("names the generic-future-visit substitutes so the model has something to say instead", () => {
      // Without positive substitutes, the model would either suppress
      // the bad phrasing and leave a structural hole, or invent a
      // worse one. The substitutes are the load-bearing other half of
      // the rule.
      const substitutes = [
        "we'd love to welcome you back",
        "we hope to see you again",
        "we hope you'll give us another chance",
      ];
      for (const sub of substitutes) {
        expect(UNIVERSAL_STRUCTURAL_RULES).toContain(sub);
      }
    });

    it("explains why this matters (sales-pitch / apology-as-condition framing)", () => {
      // The "why" lets the model judge edge cases instead of just
      // pattern-matching the example list — same approach the multi-
      // lingual blocklist took (Decision 94).
      expect(UNIVERSAL_STRUCTURAL_RULES.toLowerCase()).toContain(
        "sales pitch for the corrected version",
      );
    });
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
  // 5/25 prompt-tuning iter-2 follow-up — broadened to cover non-
  // hospitality businesses (retail, services, SaaS support). The
  // hospitality-specific cases (birthday, anniversary) stay, but
  // "first visit / returning visit" are now generalised to
  // "first time using the business / returning customer" so the
  // fragment doesn't pre-code a visit-based business model.
  it("acknowledges hospitality-shaped occasions (birthdays, anniversaries, milestones)", () => {
    expect(OCCASION_FRAGMENT).toContain("birthday");
    expect(OCCASION_FRAGMENT).toContain("anniversary");
    expect(OCCASION_FRAGMENT).toContain("milestone");
  });

  it("covers non-visit business models (first-time customers, returning customers, significant purchases)", () => {
    expect(OCCASION_FRAGMENT).toContain("first time using the business");
    expect(OCCASION_FRAGMENT).toContain("returning customer");
    expect(OCCASION_FRAGMENT).toContain("significant purchase");
  });

  // Scope-of-acknowledgement rule: the occasion fragment now explicitly
  // says the acknowledgement does NOT extend the scope of the apology
  // or commitment to the surrounding context. This is the same principle
  // as the top-level context block in claude.ts but applied at the
  // fragment level so the model sees it both globally and locally.
  it("forbids extending scope of apology/commitment to the broader context", () => {
    expect(OCCASION_FRAGMENT.toLowerCase()).toContain("does not extend the scope");
    expect(OCCASION_FRAGMENT.toLowerCase()).toContain("the broader context");
    expect(OCCASION_FRAGMENT.toLowerCase()).toContain("stay scoped to the interaction with the business");
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

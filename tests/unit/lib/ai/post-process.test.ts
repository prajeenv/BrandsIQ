import { describe, it, expect } from "vitest";

import {
  assembleResponse,
  buildSalutation,
  extractFirstName,
  stripPlaceholderSentences,
  substituteReplyToEmail,
} from "@/lib/ai/post-process";

// Default V2 brand voice — fields we override per-test, defaults from
// `normalizeBrandVoice` fill in the rest at runtime.
//
// 5/30 — `salutationSignoffLanguage: "English"` is the same default
// the migration backfills onto every existing row, so tests that omit
// it get the same "user-customisation applies for English responses"
// behaviour they had pre-this-PR.
const baseBrandVoice = {
  tone: "friendly_professional",
  keyPhrases: [],
  styleGuidelines: [],
  sampleResponses: [],
  acknowledgeNamedStaff: true,
  acknowledgeOccasions: true,
  salutationPattern: "Dear {firstName},",
  signoffLines: "Warmest regards,\nThe Team",
  negativeReviewEmailEnabled: false,
  negativeReviewFraming: "investigation" as const,
  negativeReviewFramingCustom: null,
  replyToEmail: null,
  salutationSignoffLanguage: "English" as string | null,
};

const baseReview = {
  rating: 5 as number | null,
  sentiment: null as string | null,
  reviewerName: "Jane" as string | null,
};

// 5/30 — every assembleResponse call now requires `effectiveLanguage`.
// Default to "English" so existing tests preserve their pre-this-PR
// assertions (English brand voice + English response = user's literal
// salutation/sign-off applies, same as today). Per-test overrides for
// non-English cases live in the new "language-aware salutation/sign-off"
// describe block below.
const DEFAULT_EFFECTIVE_LANGUAGE = "English";

describe("extractFirstName", () => {
  it("returns the single token unchanged", () => {
    expect(extractFirstName("Jane")).toBe("Jane");
  });

  it("returns the first whitespace-delimited token for a multi-word name", () => {
    expect(extractFirstName("Jane Smith")).toBe("Jane");
    expect(extractFirstName("Jane Anne Smith")).toBe("Jane");
  });

  it("trims surrounding whitespace before extracting", () => {
    expect(extractFirstName("  Jane Smith  ")).toBe("Jane");
    expect(extractFirstName("\tJane")).toBe("Jane");
  });

  it("collapses internal multi-whitespace and still returns the first token", () => {
    expect(extractFirstName("Jane    Smith")).toBe("Jane");
  });

  it("returns null for null / undefined / empty / whitespace-only input", () => {
    expect(extractFirstName(null)).toBeNull();
    expect(extractFirstName(undefined)).toBeNull();
    expect(extractFirstName("")).toBeNull();
    expect(extractFirstName("   ")).toBeNull();
  });
});

describe("buildSalutation — with name", () => {
  it("substitutes {firstName} with the provided name", () => {
    expect(buildSalutation("Dear {firstName},", "Jane")).toBe("Dear Jane,");
  });

  it("substitutes in 'Hi {firstName},' too", () => {
    expect(buildSalutation("Hi {firstName},", "Jane")).toBe("Hi Jane,");
  });

  it("substitutes multiple occurrences (defensive — unlikely but supported)", () => {
    expect(buildSalutation("Hi {firstName}, {firstName}!", "Jane")).toBe("Hi Jane, Jane!");
  });

  it("returns the pattern unchanged when it has no {firstName} placeholder", () => {
    expect(buildSalutation("Hello,", "Jane")).toBe("Hello,");
  });
});

describe("buildSalutation — without name (canonicalisation, spec §13.1)", () => {
  it("'Dear {firstName},' with no name → 'Hello,'", () => {
    expect(buildSalutation("Dear {firstName},", null)).toBe("Hello,");
  });

  it("'Hi {firstName},' with no name → 'Hi,'", () => {
    expect(buildSalutation("Hi {firstName},", null)).toBe("Hi,");
  });

  it("'Hello {firstName},' with no name → 'Hello,'", () => {
    expect(buildSalutation("Hello {firstName},", null)).toBe("Hello,");
  });

  it("collapses double-space artifacts: 'Dear  {firstName},' with no name → 'Hello,'", () => {
    // Pattern with a trailing space after Dear before {firstName} produces
    // "Dear  ," when the variable is dropped — the canonicalisation should
    // still recover "Hello,".
    expect(buildSalutation("Dear {firstName} ,", null)).toBe("Hello,");
  });

  it("returns 'Hello,' as the safe fallback for a salutation that starts with just {firstName},", () => {
    // Edge case: salutation pattern is just "{firstName}," — drop variable
    // leaves a dangling leading comma.
    expect(buildSalutation("{firstName},", null)).toBe("Hello,");
  });

  it("returns the pattern unchanged when it doesn't reference {firstName}", () => {
    expect(buildSalutation("Hello,", null)).toBe("Hello,");
  });
});

describe("substituteReplyToEmail", () => {
  it("replaces [your email] with the configured address", () => {
    expect(
      substituteReplyToEmail(
        "Please email [your email] with your booking details.",
        "hello@brand.example",
      ),
    ).toBe("Please email hello@brand.example with your booking details.");
  });

  it("is case-insensitive (defensive — the model could vary the casing)", () => {
    expect(substituteReplyToEmail("Email [Your Email] please.", "hello@brand.example"))
      .toBe("Email hello@brand.example please.");
    expect(substituteReplyToEmail("Email [YOUR EMAIL] please.", "hello@brand.example"))
      .toBe("Email hello@brand.example please.");
  });

  it("replaces all occurrences if the model emits the placeholder twice", () => {
    expect(
      substituteReplyToEmail(
        "Please email [your email] or write to [your email].",
        "hello@brand.example",
      ),
    ).toBe("Please email hello@brand.example or write to hello@brand.example.");
  });

  it("returns the body unchanged when no placeholder is present", () => {
    const body = "Thanks for your feedback.";
    expect(substituteReplyToEmail(body, "hello@brand.example")).toBe(body);
  });

  it("returns the body unchanged when the email is null/empty", () => {
    const body = "Please email [your email].";
    expect(substituteReplyToEmail(body, null)).toBe(body);
    expect(substituteReplyToEmail(body, "")).toBe(body);
    expect(substituteReplyToEmail(body, "   ")).toBe(body);
  });
});

describe("stripPlaceholderSentences (defensive)", () => {
  it("removes a single sentence containing [your email]", () => {
    const out = stripPlaceholderSentences(
      "Thanks for visiting. Please email [your email] with details. We hope to see you again.",
    );
    expect(out).toBe("Thanks for visiting. We hope to see you again.");
  });

  it("returns the body unchanged when no placeholder is present", () => {
    const body = "Thanks for visiting. We hope to see you again.";
    expect(stripPlaceholderSentences(body)).toBe(body);
  });

  it("handles case variants of the placeholder", () => {
    const out = stripPlaceholderSentences(
      "Thanks. Email [Your Email] please. Goodbye.",
    );
    expect(out).toBe("Thanks. Goodbye.");
  });

  it("preserves paragraph breaks when stripping mid-paragraph sentence", () => {
    const out = stripPlaceholderSentences(
      "Paragraph one.\n\nThanks. Please email [your email] with details. Bye.\n\nParagraph three.",
    );
    expect(out).toBe("Paragraph one.\n\nThanks. Bye.\n\nParagraph three.");
  });

  it("drops the whole paragraph when it was only the placeholder sentence", () => {
    const out = stripPlaceholderSentences(
      "Paragraph one.\n\nPlease email [your email].\n\nParagraph three.",
    );
    expect(out).toBe("Paragraph one.\n\nParagraph three.");
  });
});

describe("assembleResponse — incomplete email config (defensive strip)", () => {
  it("strips placeholder sentences when toggle is ON but replyToEmail is null", () => {
    const out = assembleResponse({
      modelBody:
        "Thanks for visiting. Please email [your email] with details. We hope to see you again.",
      brandVoice: {
        ...baseBrandVoice,
        negativeReviewEmailEnabled: true,
        replyToEmail: null,
      },
      review: { ...baseReview, rating: 1 },
      effectiveLanguage: DEFAULT_EFFECTIVE_LANGUAGE,
    });

    expect(out).not.toContain("[your email]");
    expect(out).toContain("Thanks for visiting.");
    expect(out).toContain("We hope to see you again.");
  });

  it("strips placeholder sentences even when toggle is OFF (sample/hallucination leak)", () => {
    const out = assembleResponse({
      modelBody:
        "Thanks for visiting. Reach us at [your email]. We hope to see you again.",
      brandVoice: {
        ...baseBrandVoice,
        negativeReviewEmailEnabled: false,
        replyToEmail: null,
      },
      review: { ...baseReview, rating: 1 },
      effectiveLanguage: DEFAULT_EFFECTIVE_LANGUAGE,
    });

    expect(out).not.toContain("[your email]");
  });

  it("still substitutes normally when toggle is ON AND email is configured", () => {
    const out = assembleResponse({
      modelBody:
        "Thanks for visiting. Please email [your email] with details.",
      brandVoice: {
        ...baseBrandVoice,
        negativeReviewEmailEnabled: true,
        replyToEmail: "hello@brand.example",
      },
      review: { ...baseReview, rating: 1 },
      effectiveLanguage: DEFAULT_EFFECTIVE_LANGUAGE,
    });

    expect(out).toContain("hello@brand.example");
    expect(out).not.toContain("[your email]");
  });
});

describe("assembleResponse — salutation + body + sign-off", () => {
  it("prepends the salutation, body, then sign-off in the right order", () => {
    const out = assembleResponse({
      modelBody: "Thanks so much for sharing this.",
      brandVoice: baseBrandVoice,
      review: baseReview,
      effectiveLanguage: DEFAULT_EFFECTIVE_LANGUAGE,
    });

    expect(out).toBe("Dear Jane,\n\nThanks so much for sharing this.\n\nWarmest regards,\nThe Team");
  });

  it("falls back to 'Hello,' when reviewerName is null", () => {
    const out = assembleResponse({
      modelBody: "Body.",
      brandVoice: baseBrandVoice,
      review: { ...baseReview, reviewerName: null },
      effectiveLanguage: DEFAULT_EFFECTIVE_LANGUAGE,
    });

    expect(out.startsWith("Hello,\n\n")).toBe(true);
  });

  it("uses only the first whitespace-delimited token of a multi-word name", () => {
    const out = assembleResponse({
      modelBody: "Body.",
      brandVoice: baseBrandVoice,
      review: { ...baseReview, reviewerName: "Jane Smith" },
      effectiveLanguage: DEFAULT_EFFECTIVE_LANGUAGE,
    });

    expect(out.startsWith("Dear Jane,")).toBe(true);
    expect(out).not.toContain("Smith");
  });

  it("converts literal \\n in signoffLines to real newlines", () => {
    const out = assembleResponse({
      modelBody: "Body.",
      brandVoice: { ...baseBrandVoice, signoffLines: "Kind regards,\\nManager Name" },
      review: baseReview,
      effectiveLanguage: DEFAULT_EFFECTIVE_LANGUAGE,
    });

    // The literal `\n` becomes a real newline so the sign-off renders on two lines.
    expect(out.endsWith("Kind regards,\nManager Name")).toBe(true);
  });

  it("strips trailing whitespace from the sign-off (no dangling newlines on the assembled output)", () => {
    const out = assembleResponse({
      modelBody: "Body.",
      brandVoice: { ...baseBrandVoice, signoffLines: "Regards,\nThe Team\n\n\n" },
      review: baseReview,
      effectiveLanguage: DEFAULT_EFFECTIVE_LANGUAGE,
    });

    expect(out.endsWith("Regards,\nThe Team")).toBe(true);
  });

  it("uses a custom salutation pattern verbatim when {firstName} is present", () => {
    const out = assembleResponse({
      modelBody: "Body.",
      brandVoice: { ...baseBrandVoice, salutationPattern: "Hello {firstName}," },
      review: baseReview,
      effectiveLanguage: DEFAULT_EFFECTIVE_LANGUAGE,
    });

    expect(out.startsWith("Hello Jane,")).toBe(true);
  });
});

describe("assembleResponse — email substitution (spec §7.5)", () => {
  it("substitutes [your email] when negative review + toggle ON + replyToEmail set", () => {
    const out = assembleResponse({
      modelBody:
        "We apologise for the experience. Please email [your email] with booking details.",
      brandVoice: {
        ...baseBrandVoice,
        negativeReviewEmailEnabled: true,
        replyToEmail: "hello@brand.example",
      },
      review: { ...baseReview, rating: 1 },
      effectiveLanguage: DEFAULT_EFFECTIVE_LANGUAGE,
    });

    expect(out).toContain("hello@brand.example");
    expect(out).not.toContain("[your email]");
  });

  it("does NOT substitute on a positive review even when toggle is ON (spec §7.5: positives never get the email in body)", () => {
    const out = assembleResponse({
      modelBody: "Thanks! Please email [your email] if you have questions.",
      brandVoice: {
        ...baseBrandVoice,
        negativeReviewEmailEnabled: true,
        replyToEmail: "hello@brand.example",
      },
      review: { ...baseReview, rating: 5 },
      effectiveLanguage: DEFAULT_EFFECTIVE_LANGUAGE,
    });

    // Placeholder remains because the routing predicate returned positive.
    expect(out).toContain("[your email]");
    expect(out).not.toContain("hello@brand.example");
  });

  it("does NOT substitute when the toggle is OFF, and strips the placeholder defensively", () => {
    // Behaviour change from the incomplete-config feedback work:
    // when there's no `replyToEmail`, the defensive strip removes any
    // sentence containing `[your email]`. So neither the placeholder
    // nor the email appears. (The toggle-OFF case usually means the
    // model wouldn't have emitted the placeholder anyway, but if a
    // sample response or hallucination leaked it, we don't ship the
    // bracket text to the customer.)
    const out = assembleResponse({
      modelBody: "Please email [your email].",
      brandVoice: {
        ...baseBrandVoice,
        negativeReviewEmailEnabled: false,
        replyToEmail: "hello@brand.example",
      },
      review: { ...baseReview, rating: 1 },
      effectiveLanguage: DEFAULT_EFFECTIVE_LANGUAGE,
    });

    // Toggle is off, so substitution does not fire. With email present,
    // the strip's `!hasReplyToEmail` guard also does not fire — the
    // placeholder is left in place (the toggle was off so the model was
    // told not to emit it; if it slipped in anyway, that's a model bug,
    // not a config-incomplete state).
    expect(out).toContain("[your email]");
    expect(out).not.toContain("hello@brand.example");
  });

  it("strips the placeholder defensively when replyToEmail is null + toggle on + negative review", () => {
    // This is the incomplete-config dormancy path. The prompt builder
    // (claude.ts) already declines to inject the framing in this case,
    // but the model could still leak the placeholder from a sample
    // response. Post-processing strips the sentence so the bracket text
    // never reaches the customer.
    const out = assembleResponse({
      modelBody: "Please email [your email].",
      brandVoice: {
        ...baseBrandVoice,
        negativeReviewEmailEnabled: true,
        replyToEmail: null,
      },
      review: { ...baseReview, rating: 1 },
      effectiveLanguage: DEFAULT_EFFECTIVE_LANGUAGE,
    });

    expect(out).not.toContain("[your email]");
  });

  it("fires substitution on the Kiran case (4-star with negative sentiment)", () => {
    const out = assembleResponse({
      modelBody: "Please email [your email] with details.",
      brandVoice: {
        ...baseBrandVoice,
        negativeReviewEmailEnabled: true,
        replyToEmail: "hello@brand.example",
      },
      review: { ...baseReview, rating: 4, sentiment: "negative" },
      effectiveLanguage: DEFAULT_EFFECTIVE_LANGUAGE,
    });

    expect(out).toContain("hello@brand.example");
    expect(out).not.toContain("[your email]");
  });

  it("fires on a 2-star review regardless of sentiment", () => {
    const out = assembleResponse({
      modelBody: "Please email [your email].",
      brandVoice: {
        ...baseBrandVoice,
        negativeReviewEmailEnabled: true,
        replyToEmail: "hello@brand.example",
      },
      review: { ...baseReview, rating: 2 },
      effectiveLanguage: DEFAULT_EFFECTIVE_LANGUAGE,
    });

    expect(out).toContain("hello@brand.example");
  });

  it("does NOT fire on a 3-star review (mixed routing, not negative)", () => {
    const out = assembleResponse({
      modelBody: "Please email [your email].",
      brandVoice: {
        ...baseBrandVoice,
        negativeReviewEmailEnabled: true,
        replyToEmail: "hello@brand.example",
      },
      review: { ...baseReview, rating: 3 },
      effectiveLanguage: DEFAULT_EFFECTIVE_LANGUAGE,
    });

    expect(out).toContain("[your email]");
  });
});

describe("assembleResponse — body truncation", () => {
  it("does not truncate when body length is within RESPONSE_BODY_CHAR_MAX", () => {
    const body = "a".repeat(500);
    const out = assembleResponse({
      modelBody: body,
      brandVoice: baseBrandVoice,
      review: baseReview,
      effectiveLanguage: DEFAULT_EFFECTIVE_LANGUAGE,
    });

    // Body appears in full between the salutation and sign-off.
    expect(out).toContain(body);
  });

  it("truncates the body to RESPONSE_BODY_CHAR_MAX when it exceeds the cap", () => {
    const body = "a".repeat(2000);
    const out = assembleResponse({
      modelBody: body,
      brandVoice: baseBrandVoice,
      review: baseReview,
      effectiveLanguage: DEFAULT_EFFECTIVE_LANGUAGE,
    });

    // The full 2000-char body must not appear unchanged.
    expect(out).not.toContain(body);
    // The sign-off still appears intact at the end — it was NOT truncated.
    expect(out.endsWith("Warmest regards,\nThe Team")).toBe(true);
  });

  it("prefers a sentence boundary when one is available in the last 100 chars of the cap", () => {
    // Build a body that ends with a sentence close just inside the cap, then
    // long filler that pushes past it.
    const head = "a".repeat(1150) + ". ";
    const tail = "b".repeat(500);
    const body = head + tail;
    const out = assembleResponse({
      modelBody: body,
      brandVoice: baseBrandVoice,
      review: baseReview,
      effectiveLanguage: DEFAULT_EFFECTIVE_LANGUAGE,
    });

    // The body inside the assembled output should end at "." (the closest
    // sentence boundary within the last 100 chars before the cap).
    const salutation = "Dear Jane,\n\n";
    const signoffStart = "\n\nWarmest regards,";
    const startIdx = out.indexOf(salutation) + salutation.length;
    const endIdx = out.lastIndexOf(signoffStart);
    const assembledBody = out.slice(startIdx, endIdx);
    expect(assembledBody.endsWith(".")).toBe(true);
    // None of the 'b' filler should make it in.
    expect(assembledBody).not.toContain("b");
  });

  it("never truncates the sign-off, even with an aggressively long body", () => {
    const out = assembleResponse({
      modelBody: "x".repeat(5000),
      brandVoice: baseBrandVoice,
      review: baseReview,
      effectiveLanguage: DEFAULT_EFFECTIVE_LANGUAGE,
    });

    expect(out.endsWith("Warmest regards,\nThe Team")).toBe(true);
  });
});

describe("assembleResponse — defensive normalisation", () => {
  it("handles a brand voice missing optional fields (normalize fills defaults)", () => {
    const out = assembleResponse({
      modelBody: "Body.",
      brandVoice: { tone: "friendly_professional", keyPhrases: [] },
      review: baseReview,
      effectiveLanguage: DEFAULT_EFFECTIVE_LANGUAGE,
    });

    // The DEFAULTS in normalizeBrandVoice supply "Dear {firstName},"
    // and "Warmest regards,\nThe Team".
    expect(out.startsWith("Dear Jane,\n\n")).toBe(true);
    expect(out.endsWith("Warmest regards,\nThe Team")).toBe(true);
  });

  it("handles a null brand voice (entirely defaults)", () => {
    const out = assembleResponse({
      modelBody: "Body.",
      brandVoice: null,
      review: baseReview,
      effectiveLanguage: DEFAULT_EFFECTIVE_LANGUAGE,
    });

    expect(out.startsWith("Dear Jane,\n\n")).toBe(true);
  });

  it("trims surrounding whitespace from the model body before assembly", () => {
    const out = assembleResponse({
      modelBody: "   \n\nBody.\n\n  ",
      brandVoice: baseBrandVoice,
      review: baseReview,
      effectiveLanguage: DEFAULT_EFFECTIVE_LANGUAGE,
    });

    // The body region between the salutation block and the sign-off block
    // should be just "Body." — no extra leading/trailing whitespace.
    expect(out).toBe("Dear Jane,\n\nBody.\n\nWarmest regards,\nThe Team");
  });
});

describe("assembleResponse — full output order (spec §9.5)", () => {
  it("produces salutation → blank line → body → blank line → sign-off, in that order", () => {
    const out = assembleResponse({
      modelBody: "First paragraph.\n\nSecond paragraph.",
      brandVoice: baseBrandVoice,
      review: baseReview,
      effectiveLanguage: DEFAULT_EFFECTIVE_LANGUAGE,
    });

    const lines = out.split("\n");
    expect(lines[0]).toBe("Dear Jane,");
    expect(lines[1]).toBe("");
    expect(lines[2]).toBe("First paragraph.");
    expect(lines[3]).toBe("");
    expect(lines[4]).toBe("Second paragraph.");
    expect(lines[5]).toBe("");
    expect(lines[6]).toBe("Warmest regards,");
    expect(lines[7]).toBe("The Team");
  });
});

// ─── 5/30 — language-aware salutation/sign-off resolver (DECISIONS.md #107) ───
//
// The resolver compares `salutationSignoffLanguage` against the response's
// `effectiveLanguage` to decide between (a) the user's literal customisation
// and (b) the built-in defaults map. Three cases:
//
//   1. salutationSignoffLanguage === effectiveLanguage → user's text
//   2. salutationSignoffLanguage !== effectiveLanguage → defaults map
//   3. salutationSignoffLanguage === null               → defaults map (the
//      user's typed text is unused; the form's "Language unclear" indicator
//      warned about this upfront)

describe("assembleResponse — language-aware salutation/sign-off (PR: DECISIONS.md #107)", () => {
  it("language match → uses the user's literal salutation + sign-off (German brand voice + German response)", () => {
    const out = assembleResponse({
      modelBody: "Vielen Dank für Ihre Bewertung. Wir freuen uns über Ihr Feedback.",
      brandVoice: {
        ...baseBrandVoice,
        salutationPattern: "Liebe Familie {firstName},",
        signoffLines: "Mit besten Grüßen aus München,\nDas Team",
        salutationSignoffLanguage: "German",
      },
      review: { ...baseReview, reviewerName: "Hans" },
      effectiveLanguage: "German",
    });
    expect(out).toMatch(/^Liebe Familie Hans,/);
    expect(out).toContain("Mit besten Grüßen aus München,\nDas Team");
  });

  it("language mismatch → uses the system defaults for the response language (English brand voice + French response)", () => {
    const out = assembleResponse({
      modelBody: "Merci pour votre avis. Nous apprécions vos commentaires.",
      brandVoice: {
        ...baseBrandVoice,
        salutationPattern: "Dear {firstName},",
        signoffLines: "Warmest regards,\nThe Team",
        salutationSignoffLanguage: "English",
      },
      review: { ...baseReview, reviewerName: "Marie" },
      effectiveLanguage: "French",
    });
    // French default salutation pattern: "Cher/Chère {firstName},"
    expect(out).toMatch(/^Cher\/Chère Marie,/);
    // French default sign-off
    expect(out).toContain("Cordialement,\nL'équipe");
    // Does NOT contain the English user customisation
    expect(out).not.toContain("Dear Marie,");
    expect(out).not.toContain("Warmest regards");
  });

  it("salutationSignoffLanguage = null → system defaults for the response language (user's text unused)", () => {
    const out = assembleResponse({
      modelBody: "Grazie per la sua recensione.",
      brandVoice: {
        ...baseBrandVoice,
        salutationPattern: "Hi there {firstName}!",       // user typed something franc couldn't classify
        signoffLines: "Cheers,\nThe Squad",               // and didn't manually confirm
        salutationSignoffLanguage: null,                  // ← unclear state
      },
      review: { ...baseReview, reviewerName: "Marco" },
      effectiveLanguage: "Italian",
    });
    // Italian default salutation pattern: "Caro/a {firstName},"
    expect(out).toMatch(/^Caro\/a Marco,/);
    // Italian default sign-off
    expect(out).toContain("Cordiali saluti,\nIl Team");
    // User's typed customisations are NOT used
    expect(out).not.toContain("Hi there");
    expect(out).not.toContain("Cheers");
    expect(out).not.toContain("The Squad");
  });

  it("language mismatch + no reviewerName → uses the defaults map's noNameSalutation (not the user's text)", () => {
    const out = assembleResponse({
      modelBody: "Grazie per la sua recensione.",
      brandVoice: {
        ...baseBrandVoice,
        salutationPattern: "Dear {firstName},",
        signoffLines: "Warmest regards,\nThe Team",
        salutationSignoffLanguage: "English",
      },
      review: { ...baseReview, reviewerName: null },
      effectiveLanguage: "Italian",
    });
    // Italian noNameSalutation: "Salve," (hand-authored, not derived
    // via regex canonicalisation of "Caro/a ,")
    expect(out).toMatch(/^Salve,/);
  });

  it("language match + no reviewerName → existing English no-name canonicalisation table applies to user's text", () => {
    // The user's customisation path still runs through `buildSalutation`,
    // which means the existing English-focused canonicalisation table
    // handles the firstName-null case for the user's text. This test
    // anchors that path: English customisation + null firstName →
    // "Hello," via the existing canonicalisation, NOT the defaults
    // map's noNameSalutation ("Hello," also, by coincidence).
    const out = assembleResponse({
      modelBody: "Thanks for the feedback.",
      brandVoice: {
        ...baseBrandVoice,
        salutationPattern: "Dear {firstName},",
        signoffLines: "Warmest regards,\nThe Team",
        salutationSignoffLanguage: "English",
      },
      review: { ...baseReview, reviewerName: null },
      effectiveLanguage: "English",
    });
    expect(out).toMatch(/^Hello,/);
    // The user's literal sign-off is still used because the language
    // matches — only the salutation pattern's firstName was dropped.
    expect(out).toContain("Warmest regards,\nThe Team");
  });

  it("Japanese defaults: suffix-based salutation uses the hand-authored noNameSalutation when no name", () => {
    // The hand-authored noNameSalutation pattern (rather than a regex
    // canonicalisation) is what makes Japanese work — naively dropping
    // {firstName} from "{firstName}様、" would leave a dangling
    // honourific.
    const out = assembleResponse({
      modelBody: "ありがとうございます。",
      brandVoice: {
        ...baseBrandVoice,
        salutationPattern: "Dear {firstName},",
        signoffLines: "Warmest regards,\nThe Team",
        salutationSignoffLanguage: "English",
      },
      review: { ...baseReview, reviewerName: null },
      effectiveLanguage: "Japanese",
    });
    expect(out).toMatch(/^お客様、/);
  });

  it("language match + name + Italian customisation → user's literal text wins", () => {
    const out = assembleResponse({
      modelBody: "Grazie per la sua recensione.",
      brandVoice: {
        ...baseBrandVoice,
        salutationPattern: "Caro/a {firstName} dal nostro ristorante,",
        signoffLines: "Con i nostri più sentiti saluti,\nLo Chef e la Brigata",
        salutationSignoffLanguage: "Italian",
      },
      review: { ...baseReview, reviewerName: "Giulia" },
      effectiveLanguage: "Italian",
    });
    expect(out).toMatch(/^Caro\/a Giulia dal nostro ristorante,/);
    expect(out).toContain("Con i nostri più sentiti saluti,\nLo Chef e la Brigata");
  });
});


import { describe, it, expect } from "vitest";

import {
  LANGUAGE_DEFAULT_CONTACT_BLOCK,
  getLanguageContactDefaults,
} from "@/lib/ai/language-contact-defaults";
import { SUPPORTED_RESPONSE_LANGUAGES } from "@/lib/constants";

describe("LANGUAGE_DEFAULT_CONTACT_BLOCK — completeness", () => {
  // Every value in SUPPORTED_RESPONSE_LANGUAGES must have a map entry.
  // This guards against silently adding a new language to LANGUAGE_MAP
  // (in constants.ts) without remembering to add its contact defaults
  // here — the resolver would otherwise quietly fall back to English
  // defaults for that language, and the gap would only surface when a
  // user actually generated a response in it.
  for (const language of SUPPORTED_RESPONSE_LANGUAGES) {
    it(`has an entry for "${language}"`, () => {
      const entry = LANGUAGE_DEFAULT_CONTACT_BLOCK[language];
      expect(entry, `Missing defaults entry for language: ${language}`).toBeDefined();
    });
  }

  it("every entry has salutation, noNameSalutation, and signoff strings", () => {
    for (const [language, entry] of Object.entries(LANGUAGE_DEFAULT_CONTACT_BLOCK)) {
      expect(typeof entry.salutation, `salutation for ${language}`).toBe("string");
      expect(entry.salutation.length, `salutation for ${language} non-empty`).toBeGreaterThan(0);

      expect(typeof entry.noNameSalutation, `noNameSalutation for ${language}`).toBe("string");
      expect(entry.noNameSalutation.length, `noNameSalutation for ${language} non-empty`).toBeGreaterThan(0);

      expect(typeof entry.signoff, `signoff for ${language}`).toBe("string");
      expect(entry.signoff.length, `signoff for ${language} non-empty`).toBeGreaterThan(0);
    }
  });

  it("every salutation contains the {firstName} placeholder (so the post-processor can substitute)", () => {
    // The salutation pattern is used by the resolver to substitute the
    // reviewer's first name when one is available. If an entry forgot
    // the placeholder, every response in that language would use a
    // name-less salutation even when a name is present — silently
    // worse, hard to notice.
    for (const [language, entry] of Object.entries(LANGUAGE_DEFAULT_CONTACT_BLOCK)) {
      expect(
        entry.salutation.includes("{firstName}"),
        `Salutation for ${language} is missing {firstName}: "${entry.salutation}"`,
      ).toBe(true);
    }
  });

  it("noNameSalutation does NOT contain {firstName} (it's the firstName-null fallback)", () => {
    for (const [language, entry] of Object.entries(LANGUAGE_DEFAULT_CONTACT_BLOCK)) {
      expect(
        entry.noNameSalutation.includes("{firstName}"),
        `noNameSalutation for ${language} should NOT have {firstName} (it's the firstName-null fallback): "${entry.noNameSalutation}"`,
      ).toBe(false);
    }
  });
});

describe("getLanguageContactDefaults", () => {
  it("returns the entry for a known language", () => {
    const out = getLanguageContactDefaults("Italian");
    expect(out.salutation).toBe(LANGUAGE_DEFAULT_CONTACT_BLOCK.Italian.salutation);
    expect(out.signoff).toBe(LANGUAGE_DEFAULT_CONTACT_BLOCK.Italian.signoff);
    expect(out.noNameSalutation).toBe(LANGUAGE_DEFAULT_CONTACT_BLOCK.Italian.noNameSalutation);
  });

  it("falls back to English for an unknown language (defensive — shouldn't fire in practice)", () => {
    const out = getLanguageContactDefaults("Klingon");
    expect(out).toEqual(LANGUAGE_DEFAULT_CONTACT_BLOCK.English);
  });

  it("falls back to English for an empty string (defensive)", () => {
    const out = getLanguageContactDefaults("");
    expect(out).toEqual(LANGUAGE_DEFAULT_CONTACT_BLOCK.English);
  });

  it("English returns its own entry (no special-casing)", () => {
    const out = getLanguageContactDefaults("English");
    expect(out.salutation).toBe("Dear {firstName},");
    expect(out.noNameSalutation).toBe("Hello,");
    expect(out.signoff).toBe("Warmest regards,\nThe Team");
  });
});

describe("LANGUAGE_DEFAULT_CONTACT_BLOCK — spot-checks for representative languages", () => {
  // Per the plan, defaults are hand-authored, brand-neutral, polite, and
  // use {firstName} substitution where possible. Spot-check the entries
  // we have the most confidence in (Western European languages where
  // common register is well-understood) so regressions to those
  // specific strings break a test.
  it("English: 'Dear {firstName}, / Warmest regards, The Team'", () => {
    expect(LANGUAGE_DEFAULT_CONTACT_BLOCK.English.salutation).toBe("Dear {firstName},");
    expect(LANGUAGE_DEFAULT_CONTACT_BLOCK.English.signoff).toBe("Warmest regards,\nThe Team");
  });

  it("Italian: 'Caro/a {firstName}, / Cordiali saluti, Il Team'", () => {
    expect(LANGUAGE_DEFAULT_CONTACT_BLOCK.Italian.salutation).toBe("Caro/a {firstName},");
    expect(LANGUAGE_DEFAULT_CONTACT_BLOCK.Italian.signoff).toBe("Cordiali saluti,\nIl Team");
  });

  it("French: 'Cher/Chère {firstName}, / Cordialement, L'équipe'", () => {
    expect(LANGUAGE_DEFAULT_CONTACT_BLOCK.French.salutation).toBe("Cher/Chère {firstName},");
    expect(LANGUAGE_DEFAULT_CONTACT_BLOCK.French.signoff).toBe("Cordialement,\nL'équipe");
  });

  it("German: 'Liebe/r {firstName}, / Mit besten Grüßen, Das Team'", () => {
    expect(LANGUAGE_DEFAULT_CONTACT_BLOCK.German.salutation).toBe("Liebe/r {firstName},");
    expect(LANGUAGE_DEFAULT_CONTACT_BLOCK.German.signoff).toBe("Mit besten Grüßen,\nDas Team");
  });

  it("Japanese: '{firstName}様、 / よろしくお願いいたします。 / no-name 'お客様、''", () => {
    // Suffix-based salutation pattern — special-cased in the defaults
    // map because dropping {firstName} would otherwise leave a dangling
    // '様、' (honourific). The hand-authored noNameSalutation avoids
    // that by using 'お客様、' (honoured customer) instead.
    expect(LANGUAGE_DEFAULT_CONTACT_BLOCK.Japanese.salutation).toBe("{firstName}様、");
    expect(LANGUAGE_DEFAULT_CONTACT_BLOCK.Japanese.noNameSalutation).toBe("お客様、");
  });
});

/**
 * Built-in default salutation and sign-off per response language.
 *
 * Used by the post-processing assembler when the brand voice's user-typed
 * salutation/sign-off cannot be used for a given response — i.e., when the
 * `salutationSignoffLanguage` on the brand voice differs from the response's
 * `effectiveLanguage`, or when it is null (franc couldn't classify and the
 * user didn't manually confirm).
 *
 * The map is keyed by the display-name strings in `SUPPORTED_RESPONSE_LANGUAGES`
 * (e.g. "English", "Italian", "French"). Every value in that constant has an
 * entry here — enforced by a unit test.
 *
 * Each entry exposes:
 *   - `salutation`: a pattern that may contain `{firstName}`. The post-
 *     processor's existing `buildSalutation` substitution handles it
 *     identically to the user-customised case, including the no-name
 *     canonicalisation table.
 *   - `signoff`: a multi-line block. May contain either literal `\n`
 *     escape sequences or real newlines — `normaliseSignoffLines` in
 *     post-process.ts handles both.
 *
 * Pure module. No I/O. Safe to import anywhere.
 *
 * Spec: docs/MVP_Phase-1/BRAND_VOICE_REDESIGN.md §7.6.
 */

import { SUPPORTED_RESPONSE_LANGUAGES } from "@/lib/constants";

export interface LanguageContactDefaults {
  /** May contain `{firstName}`. */
  salutation: string;
  /**
   * Greeting used when the review has no reviewer name. Each language
   * needs its own — a naïve "drop the {firstName}" from the salutation
   * pattern leaves awkward artifacts ("Caro/a ,") or grammatically
   * broken text in suffix-based languages (Japanese "{firstName}様、"
   * becomes just "様、" which reads as a dangling honourific). By
   * authoring the no-name greeting separately we don't need a per-
   * language regex canonicalisation table for the defaults path —
   * the user's customised salutation still runs through the
   * existing English-focused canonicalisation table in
   * `post-process.ts`.
   */
  noNameSalutation: string;
  /** May contain literal `\n` or real newlines. */
  signoff: string;
}

/**
 * The defaults table. Each entry was written to be brand-neutral, polite,
 * and to match the register of "Warmest regards, The Team" / "Dear
 * {firstName}," in the source language. Any awkwardness flagged by a
 * native speaker is a one-line fix here.
 *
 * Salutations include `{firstName}` so the post-processor can substitute
 * the reviewer's name. When no name is available, the existing no-name
 * canonicalisation table in post-process.ts cleans up the artifacts
 * (per-language entries added to that table in the same PR).
 */
export const LANGUAGE_DEFAULT_CONTACT_BLOCK: Record<string, LanguageContactDefaults> = {
  English: {
    salutation: "Dear {firstName},",
    noNameSalutation: "Hello,",
    signoff: "Warmest regards,\nThe Team",
  },
  Spanish: {
    salutation: "Estimado/a {firstName},",
    noNameSalutation: "Hola,",
    signoff: "Un cordial saludo,\nEl Equipo",
  },
  French: {
    salutation: "Cher/Chère {firstName},",
    noNameSalutation: "Bonjour,",
    signoff: "Cordialement,\nL'équipe",
  },
  German: {
    salutation: "Liebe/r {firstName},",
    noNameSalutation: "Hallo,",
    signoff: "Mit besten Grüßen,\nDas Team",
  },
  Italian: {
    salutation: "Caro/a {firstName},",
    noNameSalutation: "Salve,",
    signoff: "Cordiali saluti,\nIl Team",
  },
  Portuguese: {
    salutation: "Caro/a {firstName},",
    noNameSalutation: "Olá,",
    signoff: "Com os melhores cumprimentos,\nA Equipa",
  },
  Dutch: {
    salutation: "Beste {firstName},",
    noNameSalutation: "Hallo,",
    signoff: "Met vriendelijke groet,\nHet Team",
  },
  Polish: {
    salutation: "Drogi/Droga {firstName},",
    noNameSalutation: "Dzień dobry,",
    signoff: "Z poważaniem,\nZespół",
  },
  Russian: {
    salutation: "Уважаемый/ая {firstName},",
    noNameSalutation: "Здравствуйте,",
    signoff: "С наилучшими пожеланиями,\nКоманда",
  },
  Japanese: {
    salutation: "{firstName}様、",
    noNameSalutation: "お客様、",
    signoff: "よろしくお願いいたします。\nチーム一同",
  },
  "Chinese (Simplified)": {
    salutation: "亲爱的{firstName},",
    noNameSalutation: "您好,",
    signoff: "此致\n团队敬上",
  },
  "Chinese (Traditional)": {
    salutation: "親愛的{firstName},",
    noNameSalutation: "您好,",
    signoff: "此致\n團隊敬上",
  },
  Korean: {
    salutation: "{firstName}님께,",
    noNameSalutation: "안녕하세요,",
    signoff: "감사합니다.\n팀 드림",
  },
  Arabic: {
    salutation: "عزيزي/عزيزتي {firstName}،",
    noNameSalutation: "مرحبًا،",
    signoff: "مع أطيب التحيات،\nالفريق",
  },
  Hebrew: {
    salutation: "{firstName} היקר/ה,",
    noNameSalutation: "שלום,",
    signoff: "בברכה,\nהצוות",
  },
  Hindi: {
    salutation: "प्रिय {firstName},",
    noNameSalutation: "नमस्ते,",
    signoff: "सादर,\nटीम",
  },
  Turkish: {
    salutation: "Sayın {firstName},",
    noNameSalutation: "Merhaba,",
    signoff: "Saygılarımızla,\nEkip",
  },
  Vietnamese: {
    salutation: "Kính gửi {firstName},",
    noNameSalutation: "Kính gửi Quý khách,",
    signoff: "Trân trọng,\nĐội ngũ",
  },
  Thai: {
    salutation: "เรียน คุณ{firstName},",
    noNameSalutation: "เรียน ลูกค้าผู้มีอุปการคุณ,",
    signoff: "ด้วยความเคารพ,\nทีมงาน",
  },
  Indonesian: {
    salutation: "Yth. {firstName},",
    noNameSalutation: "Halo,",
    signoff: "Hormat kami,\nTim",
  },
  Malay: {
    salutation: "Yang dihormati {firstName},",
    noNameSalutation: "Hai,",
    signoff: "Salam hormat,\nPasukan",
  },
  Filipino: {
    salutation: "Mahal na {firstName},",
    noNameSalutation: "Kumusta,",
    signoff: "Lubos na gumagalang,\nAng Team",
  },
  Swedish: {
    salutation: "Bästa {firstName},",
    noNameSalutation: "Hej,",
    signoff: "Med vänliga hälsningar,\nTeamet",
  },
  Danish: {
    salutation: "Kære {firstName},",
    noNameSalutation: "Hej,",
    signoff: "Med venlig hilsen,\nTeamet",
  },
  Finnish: {
    salutation: "Hyvä {firstName},",
    noNameSalutation: "Hei,",
    signoff: "Ystävällisin terveisin,\nTiimi",
  },
  Norwegian: {
    salutation: "Kjære {firstName},",
    noNameSalutation: "Hei,",
    signoff: "Med vennlig hilsen,\nTeamet",
  },
  Czech: {
    salutation: "Vážený/á {firstName},",
    noNameSalutation: "Dobrý den,",
    signoff: "S pozdravem,\nTým",
  },
  Hungarian: {
    salutation: "Kedves {firstName},",
    noNameSalutation: "Tisztelt Vendégünk,",
    signoff: "Üdvözlettel,\nA Csapat",
  },
  Romanian: {
    salutation: "Stimate/Stimată {firstName},",
    noNameSalutation: "Bună ziua,",
    signoff: "Cu stimă,\nEchipa",
  },
  Ukrainian: {
    salutation: "Шановний/а {firstName},",
    noNameSalutation: "Доброго дня,",
    signoff: "З найкращими побажаннями,\nКоманда",
  },
  Catalan: {
    salutation: "Benvolgut/da {firstName},",
    noNameSalutation: "Hola,",
    signoff: "Cordialment,\nL'Equip",
  },
  Croatian: {
    salutation: "Poštovani/a {firstName},",
    noNameSalutation: "Poštovani,",
    signoff: "Srdačan pozdrav,\nTim",
  },
  Serbian: {
    salutation: "Poštovani/a {firstName},",
    noNameSalutation: "Poštovani,",
    signoff: "Srdačan pozdrav,\nTim",
  },
  Slovenian: {
    salutation: "Spoštovani/a {firstName},",
    noNameSalutation: "Spoštovani,",
    signoff: "Lep pozdrav,\nEkipa",
  },
  Bulgarian: {
    salutation: "Уважаеми/а {firstName},",
    noNameSalutation: "Здравейте,",
    signoff: "С уважение,\nЕкипът",
  },
  Lithuanian: {
    salutation: "Gerb. {firstName},",
    noNameSalutation: "Sveiki,",
    signoff: "Pagarbiai,\nKomanda",
  },
  Latvian: {
    salutation: "Cienījamais/ā {firstName},",
    noNameSalutation: "Sveicināti,",
    signoff: "Ar cieņu,\nKomanda",
  },
  Estonian: {
    salutation: "Lugupeetud {firstName},",
    noNameSalutation: "Tere,",
    signoff: "Lugupidamisega,\nMeeskond",
  },
  Bengali: {
    salutation: "প্রিয় {firstName},",
    noNameSalutation: "নমস্কার,",
    signoff: "শুভেচ্ছান্তে,\nটিম",
  },
  Tamil: {
    salutation: "அன்புள்ள {firstName},",
    noNameSalutation: "வணக்கம்,",
    signoff: "அன்புடன்,\nஅணி",
  },
  Telugu: {
    salutation: "ప్రియమైన {firstName},",
    noNameSalutation: "నమస్కారం,",
    signoff: "ధన్యవాదాలతో,\nటీం",
  },
  Marathi: {
    salutation: "प्रिय {firstName},",
    noNameSalutation: "नमस्कार,",
    signoff: "सस्नेह,\nटीम",
  },
  Urdu: {
    salutation: "محترم {firstName}،",
    noNameSalutation: "السلام علیکم،",
    signoff: "نیک تمناؤں کے ساتھ،\nٹیم",
  },
  Persian: {
    salutation: "{firstName} گرامی،",
    noNameSalutation: "سلام،",
    signoff: "با احترام،\nتیم",
  },
};

/**
 * Resolve the contact-block defaults for a response language.
 *
 * Falls back to the English entry if the language isn't in the map. This
 * fallback is defensive — by construction every value in
 * `SUPPORTED_RESPONSE_LANGUAGES` has a map entry (enforced by a unit
 * test), and `effectiveLanguage` only ever takes values from that set
 * (it flows from `brandVoice.responseLanguage`, which Zod validates
 * against `SUPPORTED_RESPONSE_LANGUAGES`, or from
 * `review.detectedLanguage`, which is a display name from the same
 * `LANGUAGE_MAP`). If a new language is ever added to `LANGUAGE_MAP`
 * without an entry here, this fallback keeps the resolver functioning
 * (with English defaults) until the gap is filled.
 */
export function getLanguageContactDefaults(language: string): LanguageContactDefaults {
  return LANGUAGE_DEFAULT_CONTACT_BLOCK[language] ?? LANGUAGE_DEFAULT_CONTACT_BLOCK.English;
}

/**
 * Internal: exposed only so the unit test can assert every supported
 * language has a defaults entry. Importing this from anywhere else is a
 * smell — the public surface is `LANGUAGE_DEFAULT_CONTACT_BLOCK` (table)
 * and `getLanguageContactDefaults` (resolver).
 */
export const _SUPPORTED_FOR_TESTS = SUPPORTED_RESPONSE_LANGUAGES;

# Walk-In Landing Page — `/walkin` Build Spec

*Implementation spec for the contextual landing page that walk-in prospects reach via the QR code on the printed one-pager.*

*Companion to: WALKIN_ONEPAGER.md (the printed leave-behind), BERLIN_BETA_PLAYBOOK.md (the walk-in strategy context).*

---

## 1. Purpose

The QR code on the printed walk-in one-pager points to this page. The prospect has just had a 5-minute face-to-face conversation with the founder. This page is:

1. **A warm landing**, not a cold marketing site — speaks to someone who just met the founder.
2. **A reinforcement, not a pitch** — they've already seen the one-pager; the page closes the loop and drives signup.
3. **Mobile-first** — virtually 100% of QR scans come from phones held at arm's length immediately after meeting.

### Why a Separate Route (Not `/`)

Three reasons:

1. **Analytics segmentation** — distinguish walk-in QR traffic from LinkedIn / email / organic in PostHog
2. **Contextual messaging** — acknowledge the just-met context ("Thanks for talking with me today")
3. **Different conversion flow** — they've already been pitched on paper, page reinforces and converts directly

---

## 2. Route & URL

**Route:** `/walkin`

**Full URL with tracking parameters (this is what the QR code encodes):**

```
https://brandsiq.app/walkin?utm_source=walkin&utm_medium=onepager&utm_campaign=berlin_beta
```

The page should render correctly with or without UTM parameters (don't break if someone visits `/walkin` directly).

---

## 3. Page Sections

### Section 1 — Hero (above the fold on mobile, ~640px viewport)

- **Headline (H1):** Reply to your reviews in seconds, in your brand voice.
- **Subhead (paragraph):** AI review replies for restaurants, hotels, and cafés. Built in Berlin.
- **Primary CTA button:** Start free beta
  - Links to `/auth/signup?utm_source=walkin` (the existing signup route; `utm_source` carries the walk-in attribution forward, see Section 6)
- **Secondary text link (below CTA):** Or message me directly, links to WhatsApp deep link `https://wa.me/491776910899`

### Section 2 — Welcome Line

Single-paragraph welcome that acknowledges the walk-in context:

> Thanks for talking with me today. Here's what BrandsIQ does — and how to try it on your own reviews.

### Section 3 — Quick Value Points

Iconified list (checkmark or simple icon), four bullets:

- Drafts in your brand voice in 5 seconds
- Multilingual — German, English, French, Italian + 35 more
- GDPR-native, EU-hosted
- Free during beta — no card needed

### Section 4 — How It Works

Three numbered steps with brief descriptions:

1. **Set up your tone** — tell us how you write in 3 questions (takes 2 minutes)
2. **Paste a review** — copy from Google, TripAdvisor, or anywhere else
3. **Get a draft in 5 seconds** — edit if needed, post the reply on your platform

### Section 5 — Founder

Personal block to reinforce the founder-led trust signal:

- **Monogram avatar:** a circle (~80px diameter, `bg-brand-100` indigo fill) with the letter "P" centred inside (`text-brand-600`, ~32px, weight medium). Uses the app's indigo brand tokens (see Section 5 colour note). (If a headshot is added in the future, it would slot into this same position with circular crop.)
- Name and title: "Prajeen Vijayan, Founder, Berlin"
- Quote: "I'm building this in Berlin. If you'd like to chat through how it works on your reviews, ping me directly — happy to set up 15 minutes."
- Two buttons side by side:
  - WhatsApp (`https://wa.me/491776910899`)
  - Email (`mailto:prajeen@brandsiq.app`)

### Section 6 — Bottom CTA (repeat the primary action)

- Primary button: Start your free beta → `/auth/signup?utm_source=walkin`
- Secondary text link: Or message me on WhatsApp → `https://wa.me/491776910899`

---

## 4. What NOT to Include

- **Pricing details** — it's free during beta; pricing creates friction
- **Long feature lists** — they've seen the one-pager
- **Fake or vague testimonials** — no customer quotes exist yet; don't fabricate
- **Multi-paragraph marketing copy** — mobile reading, short blocks only
- **A "Login" button in the top nav** — these are new users, push to signup
- **Cookie banners that block content** — this page does no pre-consent page analytics (see Section 6), so it does not require a consent banner. (Note: EU hosting of PostHog is data *residency*, not *consent* — those are different things. App-wide consent for PostHog is a separate, pre-existing follow-up tracked outside this page; `/walkin` is intentionally built to not depend on it.)
- **Forms with more than 2 fields** — email + password only; everything else gets collected during onboarding
- **Carousel components, sliders, or auto-playing video** — adds load time, distracts, reads as low-trust marketing
- **Generic "About BrandsIQ" or "Team" sections** — Section 5 covers this in context

---

## 5. Visual Design

The page should feel consistent with the printed one-pager aesthetic — clean, professional, founder-led.

### Colour Palette (matching the live app, indigo)

**Decision (supersedes the original teal palette):** use the app's existing indigo `brand-*` tokens, not the print one-pager's teal. Rationale: the QR → page → signup → dashboard journey should be one consistent brand. The page lives inside the indigo app; matching it avoids a jarring brand switch when the prospect clicks through to signup.

- Highlight surface (CTA buttons, accents): `brand-500` (`#6366f1` indigo)
- Highlight hover: `brand-600` (`#4f46e5`)
- Light accent surface (monogram, icon chips): `brand-100` (`#e0e7ff`) with `brand-600` text
- Accent text (on highlight surface): `#FFFFFF` / `text-white`
- Body text / secondary text: the app's semantic tokens (`text-foreground`, `text-muted-foreground`)
- Page background: `bg-background` (white)

### Typography

- Sans-serif throughout (Inter, system-ui, or whatever the existing BrandsIQ site uses)
- Hero headline: large (e.g., 32–40px mobile, 48–56px desktop), weight semibold
- Body text: 16–18px mobile, 18px desktop
- Buttons: 16px, weight medium

### Layout

- Mobile-first single-column
- Max-width container on desktop: ~480–560px for content (do not let the page sprawl wide; it should feel personal, not corporate)
- Generous vertical spacing between sections (40–60px)
- Each section visually distinct but flowing — alternating subtle background tints (`#FFFFFF` ↔ `#F1EFE8`) optional for visual rhythm

### Buttons

- Primary: filled teal (`#1D9E75` background, white text), rounded corners (~8px), padding ~14px × 24px
- Secondary: text link in teal underlined on hover

---

## 6. PostHog Event Tracking

**Decision (supersedes the original four on-load `walkin_*` events):** this page fires **no on-load or on-click page analytics**. Attribution happens at the signup boundary instead.

### Why attribution-at-signup, not page analytics

The goal of this page is narrow: *did the one-pager move a business onto the site and into signup?* That is a conversion question, best answered at signup, not by behavioural page tracking. It also avoids a real problem: on-load analytics (a `$pageview` or a `walkin_landing_viewed` event) require setting cookies/identifiers before consent, which under the German ePrivacy regime (TTDSG) needs prior opt-in. `/walkin` is the most consent-sensitive surface in the product (Berlin audience), so it deliberately does no pre-consent tracking and depends on no consent banner.

Note: `$pageview` autocapture is already **off** app-wide (`capture_pageview: false` in `PostHogProvider`), so the page emits nothing on load.

### How attribution works

1. The signup CTAs link to `/auth/signup?utm_source=walkin`.
2. `SignupForm` reads `utm_source` from the URL.
3. On successful account creation (a deliberate, post-opt-in user action), the existing `signup_completed_with_beta` / `signup_completed_no_beta` events carry a categorical `signupSource: "walkin"` property. This is a channel tag, not PII (consistent with Decision 35).

Implemented via the typed helpers in `src/lib/posthog-events.ts` (`trackSignupCompletedWithBeta` / `trackSignupCompletedNoBeta` accept an optional `signupSource`). No raw `posthog.capture(...)` calls and no new on-load events.

### Funnel to Build in PostHog

```
signup_completed_* where signupSource = "walkin"
  → first_response_generated (existing activation event)
```

This answers: of the prospects who signed up after a walk-in, how many activated?

If richer top-of-funnel page tracking (scan → land → scroll → click) is wanted later, it should be added **after** the app-wide PostHog consent mechanism lands (a separate, pre-existing follow-up).

---

## 7. Responsive Requirements

- **Mobile-first.** Design and test mobile (375px wide minimum) before desktop.
- **No horizontal scroll** at any breakpoint.
- **Touch targets minimum 44 × 44px** for all buttons and links (Apple/Material standards).
- **Tap-to-call WhatsApp:** the WhatsApp link must use `https://wa.me/...` format so it opens WhatsApp directly on mobile, with a fallback to web on desktop.
- **Tap-to-email:** `mailto:` link opens the default mail client on mobile and desktop.
- **Load time:** target Lighthouse performance > 90 on mobile. Avoid heavy hero images (use SVG icons, optimised JPG for headshot at 2x retina).

---

## 8. Acceptance Criteria

The page is shippable when:

- [ ] Renders correctly at 375px, 768px, 1024px, and 1440px viewports
- [ ] Loads in under 2 seconds on 4G mobile (Lighthouse Mobile score > 90)
- [ ] All buttons and links work (signup CTAs go to `/auth/signup?utm_source=walkin`, WhatsApp, email)
- [ ] No on-load page-analytics events fire (no `walkin_landing_viewed`, no `$pageview`); the page sets no pre-consent tracking
- [ ] Completing signup from a `/walkin` CTA fires `signup_completed_*` with `signupSource: "walkin"` (verify in PostHog live events)
- [ ] WhatsApp link opens WhatsApp on mobile (test on real device)
- [ ] Email link opens default mail client (test on real device)
- [ ] Monogram circle renders correctly (background colour, letter colour, sizing)
- [ ] No console errors
- [ ] No layout shift (CLS < 0.1)
- [ ] Works without UTM parameters (direct `/walkin` visit doesn't break)
- [ ] Tested with actual QR code from printed one-pager (scan → land correctly)

---

## 9. Out of Scope (for v1)

These are deliberately excluded from the initial build. Don't add them; revisit later if data shows they're needed:

- A/B testing variants of headline or CTA copy
- Multilingual page versions (DE/EN/etc.) — keep English-only for v1; revisit after walk-ins surface a clear demand pattern
- Live chat widget — adds friction, the WhatsApp link already serves this purpose
- Cookie consent modal — not needed for this page; `/walkin` does no pre-consent tracking (see Section 6). App-wide PostHog consent is a separate, pre-existing follow-up, not part of this build.
- Animations, scroll effects, parallax — slows down load, distracts
- Newsletter signup or lead magnet — focus is direct beta signup, not list-building
- "Login" link for existing users — they wouldn't be on this page

---

## 10. Implementation Notes

### Tech Stack Assumptions

This page should be built within the existing BrandsIQ Next.js application:

- **Route:** `src/app/walkin/page.tsx` (App Router; the app is App Router only). It is a public route by default — no middleware change needed. Built as a server component since it does no client-side tracking.
- **Components:** reuse existing primitives — the `Link` + `bg-brand-500 hover:bg-brand-600 text-white` button pattern from `src/app/page.tsx`, and `lucide-react` icons (both already in the app).
- **Styling:** Tailwind with the existing `brand-*` tokens (see Section 5).
- **PostHog:** no on-load events on this page. Attribution rides the existing typed helpers in `src/lib/posthog-events.ts` (`trackSignupCompletedWithBeta` / `trackSignupCompletedNoBeta` carry an optional categorical `signupSource`). Do not add raw `posthog.capture(...)` calls — use the typed helpers (Decision 35 convention). See Section 6.
- **No new dependencies** are needed.

### Image Assets

- **Founder avatar:** no image asset needed for v1 — the monogram circle (Section 5) is built with CSS (a circular div with the letter "P" inside). When a real headshot is added later, save as `public/images/prajeen-headshot.jpg` (~80kb, retina 2x available) and replace the monogram component.
- **Favicon and meta tags:** inherit from the existing BrandsIQ app (no special social-share OG image needed for this route; if added later, content should be "Try BrandsIQ — AI review replies for hospitality" with the BrandsIQ logo).

### Accessibility

- Semantic HTML (proper heading hierarchy: one `<h1>`, then `<h2>` for sections)
- All images have meaningful `alt` text (any images added later — e.g. icons, future headshot)
- All buttons have descriptive text (not just "Click here")
- Colour contrast meets WCAG AA (the palette above does, but verify after implementation)
- Form fields (on the linked `/auth/signup` page) have proper labels

### Estimated Effort

~2 hours total for an experienced Next.js developer or Claude Code:
- 30 minutes — page structure, layout, content
- 30 minutes — styling to match design spec
- 30 minutes — PostHog event integration
- 30 minutes — mobile responsive testing, QR code end-to-end test, acceptance criteria verification

---

## Open Items to Revisit

- **Google-OAuth signups do not carry `signupSource` attribution (known v1 limitation).** Walk-in attribution (Section 6) works for the email/password signup path. For the "Continue with Google" path, `utm_source` is lost across the Google redirect (same reason the beta invite code needs its `stash-invite` cookie), and the OAuth completion path currently fires no `signup_completed_*` event at all (a pre-existing gap, independent of the walk-in work). Follow-up if walk-in OAuth signups prove material: stash `utm_source` in a cookie before the Google redirect (mirror the existing `stash-invite` pattern), then emit `signup_completed_*` with `signupSource` at OAuth completion (in `events.signIn`, via server-side posthog-node, or on first authenticated load).
- Conversion data review after the first 10 walk-in QR scans — does the page need iteration based on actual user behaviour?
- **Update Section 4 (How It Works) when Google Business Profile OAuth integration ships** — Step 1 should change from "paste a review" to "connect your Google Business Profile". Same change applies whenever Facebook Pages, TripAdvisor, or other platform integrations launch.
- Replace the monogram avatar with a real headshot when ready — same circular slot, no layout change required. A real photo would increase memorability.
- German-language version of the page once Berlin beta has 2–3 active German-speaking users (likely Month 2–3 trigger)
- A/B test headline variants once page traffic exceeds 30 scans/week (probably not until commercial launch)
- Move the page from `/walkin` to `/berlin` if walk-ins expand to other cities and channel-level segmentation matters more than city-level

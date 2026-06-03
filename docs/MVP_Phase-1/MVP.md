# BrandsIQ MVP — Pricing, Tiers, Multi-Location & Phased Implementation Specification

**Status:** Approved for implementation
**Last Updated:** May 8, 2026
**Scope:** Product spec (Foundations) + Phase 1 (Pre-Launch Beta) + Phase 2 (Commercial Launch, high-level)
**Audience:** Implementation reference (Claude Code)

---

## 1. Purpose of This Document

This document is the single source of truth for the BrandsIQ MVP. It defines:

- **Foundations:** what the product *is* — tier structure, credit mechanics, multi-location strategy, data model. Both implementation phases build against this same spec.
- **Phase 1 (Pre-Launch Beta):** what gets built and shipped now — the closed beta with invite-based access, no payment infrastructure, no Stripe, no business registration.
- **Phase 2 (Commercial Launch):** what gets built once Phase 1 validation succeeds and operational prerequisites are in place — Stripe integration, payment flows, tier upgrade UI. Documented at high level only; details to be expanded when Phase 2 trigger fires.

**For Claude Code:** Read Foundations first to understand the product. Then read whichever Phase section applies to the work being done. Do not implement Phase 2 features during Phase 1.

---

## 2. Implementation Phases Overview

### Why two phases

Setting up payment infrastructure (Stripe) requires a registered business entity, which is a meaningful operational and legal commitment. The strategic decision is to validate product-market fit through a free closed beta before making that commitment, then activate commercial operations once customer traction has been demonstrated.

This produces a natural two-phase implementation:

- **Phase 1** validates product-market fit through a free closed beta. No money changes hands. Customer testimonials and Letters of Intent are collected as evidence of demand before commercial launch.
- **Phase 2** activates commercial operations after Phase 1 validation succeeds — business registration, Stripe setup, payment flows, tier upgrades.

### Phase 1: Pre-Launch Beta

**Trigger to start:** Now (immediate — already starting MVP build).

**What ships in Phase 1:**
- Full product functionality (review ingestion, response generation, brand voice, sentiment analysis, dashboard, Credit Usage History)
- Beta invite link infrastructure (one-time-use links, 60-day expiry)
- `is_beta_user` flag on the User record, set automatically when a user signs up via a valid beta invite link
- Beta-level credit allocation (150 response credits + 750 sentiment credits per month) for `is_beta_user: true` users
- Free-tier allocation (5 response credits + 25 sentiment credits per month) for direct signups without an invite code
- Profile registration capturing organization information at signup
- Unified founder-inquiry form for: expired-link recovery, beta access requests from Free users, "request more credits" from beta users at zero balance
- Pricing page with "BrandsIQ is currently in closed beta" banner and beta-access request CTA (no specific launch date promised)
- All tier enforcement rules (credit deduction, anniversary reset, sentiment soft-limit) operating identically to how they will at commercial launch

**What does NOT ship in Phase 1:**
- Stripe integration of any kind
- Payment flows of any kind
- Tier upgrade UI (no upgrade buttons on the pricing page or dashboard — they would have nowhere to go)
- Credit pack purchases (the data model and quota logic exists, but no purchase mechanism)
- Business registration (legal/operational setup)
- Subscription cancellation flows

### Phase 2: Commercial Launch

**Trigger to start:** Phase 1 validation complete and operational prerequisites in place (business registration, Stripe setup, etc. — see Section 16). Until then, Phase 2 work does not begin.

**What Phase 2 adds (high level):**
- Stripe account setup, products configuration, webhook handlers
- Subscription checkout flow (Free → Starter or Growth)
- Tier upgrade and downgrade flows with anniversary handling
- Credit pack purchase flow (atomic dual-balance update via Stripe one-time payment)
- Subscription cancellation flow
- Differentiated zero-balance dialog (Free shows upgrade only; paid shows upgrade + pack purchase)
- Pricing page transitions from "Closed beta" banner to live tier selection
- Beta-to-paid migration: existing beta users get a 60-day grace period to convert to a paid tier or revert to Free

Phase 2 details are intentionally not specified yet. They will be expanded into a full implementation specification when the Phase 2 trigger fires. See Section 16.

### Phase transition mechanism

A system-level configuration flag (e.g., `current_phase: 'phase_1'` or `'phase_2'`) controls signup behavior and pricing page rendering. Flipping this flag at commercial launch:

- New signups stop receiving `is_beta_user: true` automatically (beta invite links also stop being generated)
- Pricing page swaps from "Closed beta" banner to live tier selection with upgrade buttons
- Beta-to-paid grace period clock starts for all existing beta users

**Implementation note:** The flag is stored as a Vercel environment variable (`CURRENT_PHASE=phase_1` or `phase_2`), not a database row. The phase flips once, ever; a Vercel redeploy (~90s) is acceptable for a one-time transition, and avoids the cost of building a cache + invalidation path for a setting that almost never changes.

---

# FOUNDATIONS

The sections below define the product specification. Both Phase 1 and Phase 2 implement against these rules.

---

## 3. Core Pricing Philosophy

BrandsIQ uses **one-axis pricing**: customers pay for AI work performed (credits), not for organizational dimensions (locations, users, seats).

**Why this matters for implementation:**

- Credits are the only metered quantity that affects price
- Locations and users are gated by tier features, but never priced per-unit
- Customers should be incentivized to ingest as many reviews as possible into the system, because more reviews → more response generation → more credit consumption → more revenue (post-Phase-2)

**Implication:** Anywhere the product could plausibly add a per-location, per-user, or per-review charge, the answer is no. The only thing customers pay for beyond the tier subscription is additional credits via packs (Phase 2).

---

## 4. Tier Structure

### Commercial Tiers (active in Phase 2)

| Tier | Price (USD) | Response Credits | Sentiment Quota | Users | Locations |
|------|-------------|------------------|-----------------|-------|-----------|
| Free | $0 | 5/month | 25/month | 1 | 1 |
| Starter | $29/month | 30/month | 150/month | 1 | 1 |
| Growth | $79/month | 100/month | 500/month | 1 | 1 |

### Beta Plan (active in Phase 1 only)

| Plan | Price | Response Credits | Sentiment Quota | Users | Locations | Identification |
|------|-------|------------------|-----------------|-------|-----------|----------------|
| Beta | $0 | 150/month | 750/month | 1 | 1 | `is_beta_user: true` set via invite link |

**Notes for implementation:**

- For MVP, all tiers and the beta plan enforce **1 location per account** at the application layer, even though the data model supports unlimited locations (see Section 7 and Section 8).
- All tiers and the beta plan enforce **1 user per account** for MVP.
- Beta plan is not a tier — it is a flag (`is_beta_user`) that overrides normal tier-based credit allocation. A user is either on the Beta plan (`is_beta_user: true`) or on a regular tier (`is_beta_user: false`), never both.
- All tiers monthly billing only for MVP. Annual billing is post-MVP.

---

## 5. Credit Mechanics

### Response Credits

- **1 credit = 1 Claude API call**
- **Estimated ~2 credits per final published response** (initial generation + occasional regeneration)
- This 2.0 multiplier is an assumption, not a measured value. Track actual ratio per user during Phase 1 and adjust tier limits if real data diverges meaningfully.
- **Why credits, not responses:** Credits are the actual unit of API cost. Easier to measure precisely, easier to raise quotas later than lower them, more honest unit of metering.

### Sentiment Quota (Separate)

- Powered by DeepSeek API (~10x cheaper than Claude)
- Counted separately from response credits — never deducted from response credits
- When sentiment quota is exhausted, system continues to function:
  - Reviews still ingest
  - Responses still generate
  - Reviews are saved with `sentiment = null`
  - Sentiment analysis resumes next billing cycle

### Display Approach

Credits are the billing unit and the primary number shown to customers. The dashboard separately surfaces **count of responses generated** as a usage indicator, but does not present a credit-to-response ratio anywhere.

**Why no ratio:** The 2-credits-per-response figure is an estimate that varies by user behavior (regenerations, edits). Promising "30 credits ≈ 15 responses" sets an expectation we cannot guarantee — a heavy-regeneration user might get 10 responses from 30 credits and feel misled. Showing credits as the unit and responses-generated as actual usage avoids creating that gap.

### Anniversary Reset

- Response credits reset on **subscription anniversary date** (e.g., user who signed up on the 17th has credits reset on the 17th of each month). This is already implemented.
- Sentiment quota resets on the same anniversary cadence.
- Beta plan users follow the same anniversary reset rule.
- Reset is handled by the **existing scheduled cron job**.

---

## 6. Overage Strategy: Credit Packs

When commercial customers exceed their monthly credits in Phase 2, they buy credit packs. **Do not implement per-response overage pricing** — packs are simpler and align with how customers think about top-ups.

### Pack Structure

| Pack | Available to | Response Credits | Sentiment Credits | Price (USD) | Per-response-credit rate |
|------|--------------|------------------|-------------------|-------------|--------------------------|
| Starter pack | Starter subscribers | 5 | 25 | $6 | $1.20 |
| Growth pack | Growth subscribers | 10 | 50 | $12 | $1.20 |

**Tier-proportional pack sizing.** Each tier has a pack sized to ~17% of its monthly tier allocation, so pack purchases feel proportional to the customer's baseline rather than a disproportionate financial step. The Starter pack at $6/5 credits is right-sized for a Starter customer's typical spike; the Growth pack at $12/10 credits is right-sized for a Growth customer's typical spike. Customers can purchase multiple packs if they need more.

**Equal per-credit rate across both packs.** Both packs are priced at $1.20 per response credit — the differential is in size, not in unit rate. There is no "Starter premium" pricing on the Starter pack. Upgrade pressure comes from the substantial gap between pack rate ($1.20) and Growth tier rate ($0.79), which applies identically at both tiers.

**The pack is a bundle.** Every pack purchase atomically adds both credit types to the account. There is no option to buy response credits without sentiment credits, or vice versa. This mirrors the tier upgrade experience — moving from Starter to Growth bumps both credit types together (30→100 response, 150→500 sentiment), and packs follow the same model.

The 1:5 ratio (response : sentiment) is consistent across all tiers (Starter: 30:150, Growth: 100:500) and is preserved in both packs (Starter pack: 5:25, Growth pack: 10:50). A pack is effectively a "fractional capacity boost" on the same proportions as the tier the customer holds.

### Pack Availability

| Plan | Pack Available |
|------|----------------|
| Free | None |
| Starter | Starter pack (5 response + 25 sentiment, $6) |
| Growth | Growth pack (10 response + 50 sentiment, $12) |
| Beta | None (no payment infrastructure in Phase 1; beta users use the "request more credits" form instead) |

Each subscriber sees only the pack matching their tier. A Starter customer cannot buy a Growth pack, and vice versa — this keeps pricing predictable and prevents customers from gaming the system by subscribing to Starter and buying Growth packs.

**Why Free is excluded from packs:**

- Free tier exists to drive upgrades to paid tiers, not to be a viable indefinite plan with top-ups
- Allowing pack purchases on Free would let users stay on Free forever while occasionally topping up — the worst possible conversion path
- Industry standard: most freemium SaaS does not sell add-ons to free users

**Why beta users can't buy packs:**

- Phase 1 has no Stripe / payment infrastructure built
- Beta users at zero balance use the "request more credits" form (Section 13.4) — Founder responds manually with grant, conversation, or both

### Pack Pricing Rationale (Critical — Do Not Lower Pack Prices)

Pack pricing must preserve the upgrade incentive between tiers. The per-credit rate of packs (computed against **response credits**, the primary purchase driver) must be **higher** than any tier's per-response-credit rate, otherwise customers will buy packs forever instead of upgrading.

Per-response-credit rates:

- Starter tier: $29 / 30 = $0.97 per response credit
- Growth tier: $79 / 100 = $0.79 per response credit
- Both packs: $1.20 per response credit ← **must remain the highest rate**

The bundled sentiment credits in each pack are **additional value at marginal cost** (sentiment runs on DeepSeek). They are not separately priced and the customer does not see them as a separable purchase — the pack is marketed and sold as one unit.

**Worked example of upgrade pressure:**

A Starter user who consistently needs ~80 response credits/month:

- Via Starter packs (5 credits each): $29 (Starter) + 10 packs × $6 = $89 for 80 response credits
- Via Growth tier: $79 for 100 response credits

Growth is cheaper *and* delivers more of both credit types. The math itself drives the upgrade.

A Starter user needing only ~50 credits/month:

- Via Starter packs: $29 + 4 packs × $6 = $53 for 50 credits
- Via Growth tier: $79 for 100 credits

Starter + packs wins — and that's correct. This customer is not a Growth customer; they're a heavy-Starter customer. The packs serve them well without forcing a tier change.

**Do not lower pack prices.** If pack pricing ever drops below the Growth per-credit rate (e.g., a "value pack" at $4 for 5 credits = $0.80/credit), this incentive breaks and Starter users will rationally stay on Starter forever buying packs. **Do not introduce volume-discounted larger packs without re-validating this math.**

### Pack Mechanics (Phase 2)

- **Pack purchase atomically adds both credit types in a single transaction.** Starter pack: +5 response and +25 sentiment. Growth pack: +10 response and +50 sentiment. Both updates must succeed or both must fail — no partial application.
- Pack credits are added to the same balance as tier credits — **single bucket per credit type** per account, no separate tracking of "tier credits" vs "pack credits"
- **All credits (tier + pack, response + sentiment) expire at the subscription anniversary.** A pack purchased mid-cycle adds credits to the current cycle's balance; the entire balance resets on the next anniversary regardless of when packs were purchased within the cycle. This means pack credits do not accumulate beyond one cycle.
- Credit Usage History (already implemented) must log both credit additions from a pack purchase, linked by a shared transaction ID for traceability

### Why Anniversary Expiry (Not Per-Pack Expiry)

This decision aligns with monthly-subscription SaaS norms (e.g., Writesonic explicitly: "Unused credits do not roll over to the next month. All remaining credits expire at month's end."). The 1-year expiry seen at Anthropic and OpenAI applies to their developer API products, which are a different product category and not the right reference for monthly consumer SaaS.

Benefits of single-bucket anniversary expiry:

- **One rule customers must remember:** "Your credits reset on the 17th."
- **One implementation:** existing anniversary cron resets the balance to the tier amount; no per-pack expires_at field
- **Stronger upgrade signal:** customers who repeatedly buy packs and lose unused credits at month-end get a visible cue that they should be on a higher tier
- **No contradictory UI messaging:** avoids the confusion of "your cycle resets on day X but credits you bought today expire later"

### Required Pack Purchase Modal Content (Phase 2)

The pack purchase modal **must** clearly display:

1. The bundled contents of the pack (both credit types)
2. The price
3. The upcoming reset date and remaining time (informational, not conditional)

Example modal copy for a Growth pack:

> **Top-up pack — $12**
> 10 response credits + 50 sentiment credits
> Credits expire on your next reset date: **June 17 (in 2 days)**.

The reset date display is non-negotiable — without it, customers buying packs late in their cycle would feel surprised when credits expire. With it, they're making an informed decision.

**No conditional suggestions in the modal.** The modal does not change its content or suggest alternatives based on how close the customer is to their reset date. A late-cycle pack purchase is the customer's informed choice, not a problem the system should intervene to prevent.

**No pattern-based upgrade suggestions in the pack modal.** Suggesting tier upgrades in the pack purchase flow risks feeling pushy at a moment when the customer just wants to keep working. Pattern-based upgrade nudges (e.g., "you've bought 3 packs in 2 months — consider Growth") are a separate concern, not built in MVP, and would live in dashboard or email surfaces if added later.

**Edge case handling.** If a customer buys a pack near their reset date and feels they didn't get fair value, the founder-inquiry form (Section 13.4) is the escape valve. The founder can grant goodwill credits manually. If this pattern repeats across multiple customers, that's signal to consider a smaller pack option later — but not a reason to add complexity to the modal now.

---

## 7. Multi-Location Strategy

### MVP Decision: 1 Location Per Account (Enforced at UI Level)

For MVP — both Phase 1 and Phase 2 — every plan supports exactly **one location per account**. Customers cannot create multiple locations through the UI. This is enforced at the application layer.

**Why single-location for MVP:**

- The ideal MVP customer is one who will pilot BrandsIQ on a single location to evaluate it before any rollout decision
- Multi-location UI (location switcher, per-location filtering, per-location brand voice) is a significant build that should not block MVP launch. It will be triggered by beta user signal — see PRICING_ROADMAP.md.
- Single-location scope simplifies the dashboard, brand voice, review inbox, and analytics surfaces

**Important distinction — UI vs. data model:**

- **UI/feature layer:** 1 location per account, enforced
- **Data model:** Supports unlimited locations per account from day 1 (see Section 8)

The data model is forward-compatible with multi-location even though the MVP UI does not expose it. This avoids painful migrations when multi-location ships post-MVP.

### Post-MVP: Unlimited Locations on Paid Tiers (See PRICING_ROADMAP.md)

The post-MVP target is unlimited locations on every paid tier (Free remains capped at 1). The reasoning — that limiting locations suppresses review ingestion, which suppresses credit consumption, which suppresses revenue — is documented in PRICING_ROADMAP.md.

---

## 8. Data Model Requirements (Multi-Location)

To avoid expensive refactoring when multi-location UI is built, the MVP data layer must already support the full structure.

**MVP simplification — User-as-account:** Because MVP enforces 1 user per account (Section 4), the existing `User` model serves as the account-equivalent in MVP. The proper standalone `Account` model is deferred to the multi-user / Scale-tier work and will be introduced via the standard expand → backfill → contract migration when needed (see post-MVP migration notes in `DECISIONS.md`). Until then, the entries below that say "foreign-keyed to `Account`" are implemented as foreign-keyed to `User`. The schema-level forward-compatibility goal is preserved — a future migration adds an `Account` row per existing user 1:1, then re-points FKs.

### Required from Day 1

- `Account` (top-level) → owns all data **(MVP: implemented as `User`)**
- `Location` table with foreign key to `Account` (unlimited rows per account at the schema level) **(MVP: FK to `User`)**
- `Review` table has a `location_id` foreign key
- `BrandVoice` table foreign-keyed to `Account` for now (single voice per account in MVP) **(MVP: already FK'd to `User` — no change)**
- `User` table foreign-keyed to `Account` (1 user per account in MVP, but schema supports many) **(MVP: User is the account; this FK is deferred)**
- `User.is_beta_user` boolean (Phase 1; controls whether the user gets beta plan allocation)
- `Organization` profile fields on `Account` (see Section 9 — Profile Registration) **(MVP: profile fields on `User`)**
- `BetaInviteLink` table (Phase 1; see Section 13.1)
- `FounderInquiry` table (Phase 1; see Section 13.4)

### Forward Compatibility

When multi-location UI ships, these schemas extend without breaking changes:

- `BrandVoice` gets an optional `location_id` (null = account-wide, set = location-specific)
- `User` table already supports multiple rows per account
- `Review` already has `location_id`, so per-location filtering is a query change, not a migration

**Implementation note:** Do not skip the `location_id` foreign key on `Review` even though MVP only displays one location. Backfilling location IDs onto historical reviews later is painful.

---

## 9. Profile Registration

All users — whether arriving via beta invite link or signing up directly — complete profile registration during signup. The fields collected provide context for product use, brand voice generation, and post-MVP segmentation analysis.

### Mandatory Fields

- **Organization name:** the business entity that owns the location(s). Used for invoicing context (Phase 2) and conversational reference.
- **Industry / business type:** dropdown (restaurant, hotel, retail, e-commerce, other). Affects brand voice generation defaults and product positioning.
- **Country:** needed for GDPR scope, currency display, and tax compliance later.
- **Location name:** the single location the account starts with (MVP supports 1 location only).

### Optional Fields

- **Number of locations operated:** even though MVP supports 1 location, knowing the operator runs 5 locations tells you they're a future Scale customer. Useful pipeline data.
- **Primary review platform:** Google Business / Trustpilot / TripAdvisor / multiple. For MVP this is Google only, but the question signals what platforms to add next.

### For No-Code (Direct) Signups Only

Users who arrive without a beta invite link see two additional optional fields:

- **"Are you exploring BrandsIQ for beta access?"** (radio: yes / just trying it out / unsure)
- **Free-text: "Tell us briefly about your review management challenge."**

If the user answers "yes" to beta interest OR provides text in the free-text field, the system creates a `FounderInquiry` record of type `beta_request` (see Section 13.4) so the founder is notified and can follow up.

### What Is NOT Collected at Signup

- **Monthly review volume.** Originally proposed but removed because (a) chain operators often don't have this number readily available, (b) per-location vs. total ambiguity creates friction, (c) self-reported estimates are unreliable, and (d) actual usage data from PostHog is more accurate and arrives within 2 weeks of beta start. Volume-related questions are better surfaced through founder conversations during beta engagement.

---

## 10. Tier Enforcement Logic

### What's Enforced

- **Response credits:** Hard limit. When credits hit 0, response generation is blocked. UI shows tier-appropriate options (see Section 12.4 for Phase 1 behavior; Section 16 for Phase 2 behavior).
- **Sentiment quota:** Soft limit. When quota hits 0, sentiment analysis is silently skipped (review saves with `sentiment = null`). No error to the user, no blocking. Resumes next billing cycle.
- **User limit (1 user):** Enforced at signup/invite. Cannot invite a second user.
- **Location limit (1 location):** Enforced at the application layer. Cannot create a second location through the UI.

### Anniversary Reset (Already Implemented)

See Section 5 — Credit Mechanics. Reset is handled by the existing scheduled cron job. No changes needed for Phase 1 or Phase 2.

### Credit Usage History (Already Implemented)

The Credit Usage History page is already implemented. It provides per-user audit trail of credit consumption (response generation, regeneration). For GDPR compliance, this audit trail must survive user deletion via anonymisation. This is shipped on **all plans** (Free, Beta, Starter, Growth) — it is not a tier-gated feature.

---

## 11. What's Out of MVP Scope Entirely

These features are not built in either Phase 1 or Phase 2. They are documented separately in PRICING_ROADMAP.md with their own trigger conditions for future builds.

- **Scale tier ($199 target)** — built post-MVP when 3+ qualified prospects request multi-location features beyond Growth's scope
- **Enterprise tier (custom pricing)** — built when first 10+ location operator engages or security-sensitive industry customer requests SSO / audit logs / SLA
- **Multi-location UI** (location switcher, per-location dashboards, ability to add a second location) — built when 2 of 5 beta users explicitly request it
- **Per-location brand voice** — ships with multi-location UI
- **Multi-user accounts** — ships with Scale tier
- **Role-based access control (RBAC)** — Scale+
- **Approval workflows** — Scale+
- **Cross-location analytics** — Scale+
- **Account-level audit logs** — Scale+ (distinct from per-user Credit Usage History, which is shipped on all plans)
- **API access** — Enterprise only
- **SSO / SAML** — Enterprise only
- **Annual billing** — post-MVP
- **Per-user, per-location, or per-seat pricing** — never to be added (see Section 3 — Core Pricing Philosophy)

**Note:** "Out of MVP scope" means these are not built in either Phase 1 or Phase 2. "Phase 2 deferred" (Section 16) means built later in MVP, after Phase 1 validation completes. Do not confuse the two categories.

---

# PHASE 1 — PRE-LAUNCH BETA

The sections below specify Phase 1 implementation. Build everything here. Do not build anything in the Phase 2 section (after the marker further down) until the Phase 2 trigger fires.

---

## 12. Phase 1 Scope and Behavior

### 12.1 Overview

Phase 1 is a free closed beta with no payment infrastructure. It validates product-market fit, generates LOIs and testimonials, and produces customer evidence supporting commercial launch readiness. See `BETA_ENGAGEMENT_PLAYBOOK.md` for engagement timeline and conversion strategy.

### 12.2 Beta User Identification: Beta Invite Links

Beta users are identified by signing up through a unique invite link. Direct signups (no link) become Free tier users.

**Why invite links and not invite codes:**

- The founder's GTM is push-based (cold DMs on Instagram and LinkedIn). The link can be sent in a DM and clicked directly — no friction of "wait for me to send a code."
- Each link is uniquely associated with the prospect it was sent to, providing automatic identification at signup time.

**Why links and not fully-open signup:**

- Open signup with automatic `is_beta_user: true` exposes the system to random users consuming beta-level credits without founder selection
- Open signup with manual flag-flipping post-signup creates an identification problem (founder has to match a signup record to a prospect they DMed) and requires a follow-up DM to confirm
- Invite links eliminate both problems: the link itself carries the identity

### 12.3 Allocation: Beta Plan

Users who sign up via a valid beta invite link have `is_beta_user: true` and receive:

- **150 response credits per month** (anniversary reset)
- **750 sentiment credits per month** (anniversary reset)

This is 50% above Growth tier's 100/500 allocation. The reasoning:

- Beta users are not yet on a tier — final tier assignment happens at commercial launch based on observed usage data
- Generous allocation removes artificial constraints during the validation phase, producing more representative usage data
- 150/750 is tight enough that high-volume customers (140+ reviews/month) will see they're approaching the limit, surfacing the signal that they may be Scale-tier customers post-MVP
- Visible credit balance creates the same psychological constraint paying customers will have, so usage patterns remain representative

**Beta users cannot buy credit packs** (no payment infrastructure in Phase 1). When at zero balance, they use the "request more credits" form (Section 13.4).

### 12.4 Zero-Balance Behavior in Phase 1

When any user (Beta or Free) hits 0 response credits in Phase 1, the existing zero-balance dialog appears. In Phase 1 specifically:

- **Free users at zero:** dialog shows a "Request beta access" CTA (opens the founder-inquiry form, type = `beta_request`). No upgrade buttons (no Stripe in Phase 1).
- **Beta users at zero:** dialog shows a "Request more credits" CTA (opens the founder-inquiry form, type = `more_credits`). No pack purchase button.

The dialog itself is **already implemented**. What changes for Phase 1 is what the CTA buttons route to — both route to the founder-inquiry form rather than a Stripe checkout.

### 12.5 Pricing Page in Phase 1

The pricing page **exists** in Phase 1 and shows tier information (Free, Starter, Growth) with credit allocations and prices. It does NOT include functional upgrade buttons.

Required banner at the top of the pricing page during Phase 1:

> **BrandsIQ is currently in closed beta.**
> [Request beta access →]
> (button opens the founder-inquiry form)

No specific launch date is promised in the banner — committing to a date that may slip causes more trust damage than vague-but-honest framing. The `current_phase` system flag (Section 2 — Phase transition mechanism) controls whether this banner is shown or replaced with the live pricing page in Phase 2.

### 12.6 What's Intentionally Absent in Phase 1

Building these would be wasted effort and creates legal exposure:

- No Stripe account, no Stripe SDK integration
- No payment flows of any kind (subscription checkout, pack purchase, tier upgrade)
- No company registration, no business entity, no tax setup
- No "Upgrade to Starter / Growth" buttons in the dashboard (they would have nowhere to go)
- No subscription cancellation flow
- No invoicing system

If a beta user asks "how do I pay?" during Phase 1, the answer is: "I'm running pre-launch beta and not yet set up to take payments. I'll come back to you when commercial pricing launches — likely a few months out." This is the script in `BETA_ENGAGEMENT_PLAYBOOK.md` Section 8.4.

---

## 13. Phase 1 Implementation Action List

The concrete features to build in Phase 1, with two-sentence descriptions per item.

### 13.1 Beta Invite Link Infrastructure

**Description:** Add `BetaInviteLink` table with fields for `code`, `created_at`, `notes`, `used_at`, `used_by_user_id`, and `expires_at` (60 days from creation). Build a simple admin page (or CLI tool) for the founder to generate links with a notes field, returning a URL like `https://brandsiq.app/signup?b={code}`.

**Behavior:**
- Each link is single-use (cannot be reused after `used_at` is set)
- Each link expires 60 days from creation
- Used links remain in the database for audit trail; they are not deleted

### 13.2 Signup Flow with Invite Code Handling

**Description:** Modify the signup form to accept a `b={code}` query parameter, look up the code in `BetaInviteLink` on form submission, and set `is_beta_user: true` on the new User record only if the code is valid (exists, unused, not expired). Direct signups without a code create users with `is_beta_user: false`.

**Behavior on edge cases:**
- Valid unused code → `is_beta_user: true`, beta plan allocation, link marked as used with `used_by_user_id` set
- Expired or already-used code → user is shown the expired-link page (see 13.3) before completing signup, NOT silently downgraded to Free
- No code provided → standard Free tier signup

**OAuth signup with invite code:** The OAuth round-trip to Google drops URL params, so the invite code must be persisted across the redirect. Implementation: when the user clicks "Sign up with Google" from `/auth/signup?b=<code>`, a short-lived HttpOnly cookie (`bx_invite_code`, 10-minute Max-Age) is set server-side via a small endpoint before the OAuth redirect. NextAuth's `events.signIn` reads the cookie when `isNewUser === true`, validates the code, sets `is_beta_user: true`, allocates the beta plan, marks the link used, and clears the cookie — all in one transaction. If the cookie is missing or the code is invalid by the time OAuth completes, the user is created as a Free user (the user is already authenticated by Google at that point; redirecting them to the expired-link page would be jarring).

### 13.3 Expired/Invalid Beta Link Page

**Description:** When a user clicks a beta invite link with an expired or already-used code, show a clear error page explaining the situation, with an embedded form (NOT a mailto link) to request a fresh invite, and an option to continue as a Free tier signup. The form fields are name, email, business name, optional message; submission creates a `FounderInquiry` record of type `beta_request` and triggers an email notification to the founder.

**Page copy (reference):**

> **This beta invite link has expired or has already been used.**
>
> If you received this link recently and expected beta access, fill in the form below and we'll send you a fresh invite within 24 hours.
>
> [Form: Name, Email, Business name, optional message]
> [Submit]
>
> Or, if you'd like to try BrandsIQ on the free tier: [Continue with regular signup →]

### 13.4 Unified Founder-Inquiry Form

**Description:** A single form component used in three places — expired-link page, "request beta access" CTA on the pricing page and Free-user zero-balance dialog, and "request more credits" CTA on the beta-user zero-balance dialog. All three submissions create records in a `FounderInquiry` table with a `type` field (values: `beta_request`, `more_credits`, `general`) and trigger an email notification to the founder.

**Schema:** `FounderInquiry` table with fields: `id`, `user_id` (nullable for pre-signup expired-link recovery), `type` (enum), `business_info` (JSON), `message` (text), `created_at`, `resolved_at` (nullable), `founder_notes` (text, nullable).

**Admin view:** simple page listing pending inquiries with type, submitter info, and message. Founder marks each as resolved with notes after responding.

**No confirmation email back to the inquirer.** The expired-link page already states the contract ("we'll send you a fresh invite within 24 hours"); a separate confirmation email would be development effort for no validation signal. The founder responds personally via the channel that fits the context (email, WhatsApp).

### 13.5 Profile Registration

**Description:** Extend the signup flow with profile registration fields per Section 9 — mandatory fields (organization name, industry, country, location name) and optional fields (location count, primary platform). For no-code signups, additionally show beta intent radio + free-text challenge field; non-empty submissions create a `FounderInquiry` of type `beta_request`.

**Schema additions:** new columns on `Account` for `organization_name`, `industry`, `country`, `location_count_estimate`, `primary_platform`, `signup_intent` (no-code only), `signup_challenge_text` (no-code only).

### 13.6 Beta-Plan Allocation Logic

**Description:** Modify the credit allocation logic so that when calculating monthly allocation for a user, the system checks `is_beta_user` first: if true, allocates 150 response credits + 750 sentiment credits; otherwise allocates per the user's assigned tier (Free 5/25, Starter 30/150, Growth 100/500). The anniversary reset cron continues to call this same allocation logic — no separate cron job is needed.

**Behavior:** Beta users are subject to identical anniversary reset rules as paid tiers. No carry-forward, no special treatment beyond the higher allocation amount.

### 13.7 Differentiated Zero-Balance Dialog (Phase 1 Mode)

**Description:** Update the existing zero-balance dialog to read the user's `is_beta_user` flag and current tier, then render the appropriate CTA — "Request more credits" for beta users, "Request beta access" for Free users. Both CTAs open the founder-inquiry form (Section 13.4). No upgrade or pack-purchase buttons are shown in Phase 1.

**Phase 2 reminder:** The dialog will need updating again at Phase 2 transition to add Stripe-based upgrade and pack-purchase buttons. See Section 16.

### 13.8 Pricing Page with Closed-Beta Banner

**Description:** Build the pricing page showing Free, Starter, and Growth tiers with their respective allocations and prices, with a prominent "BrandsIQ is currently in closed beta" banner at the top and a "Request beta access" CTA that opens the founder-inquiry form. No upgrade buttons on the tier cards in Phase 1; the banner explains why.

**Phase 2 reminder:** Banner is replaced with live tier selection at commercial launch, controlled by the `current_phase` system flag.

### 13.9 PostHog Event Taxonomy

**Description:** Add PostHog events for the validation targets defined in Section 14 — `response_generated`, `response_regenerated`, `sentiment_analyzed`, `credit_balance_low`, `zero_balance_dialog_shown`, `founder_inquiry_submitted`, `beta_invite_link_used`, `signup_completed_with_beta`, `signup_completed_no_beta`. Each event includes relevant properties (user ID, plan type, credit amounts).

**Why this matters:** These events feed the data-driven tier assignment conversation at commercial launch. Without them, you cannot reliably tell each beta user which tier matches their actual usage.

### 13.10 Sentry Coverage for Phase 1 Flows

**Description:** Add Sentry error capture on the new signup flows (invite link validation, profile registration submission, founder-inquiry form submission) and on the beta-allocation logic (any failure to apply 150/750 allocation should be loud, not silent). Existing Sentry coverage on credit deduction and sentiment analysis paths remains as-is.

### 13.11 Verify Anniversary Cron with Beta Plan

**Description:** Verify (and add tests if missing) that the existing anniversary reset cron correctly handles `is_beta_user: true` users — reset their balance to 150/750 each anniversary, not to a tier-based amount. This is a test/verification task, not new build.

### 13.12 Location Onboarding Migration for Existing Accounts

**Description:** For users who signed up before location onboarding existed, auto-create a "Default Location" record on their `Account` and attach all their existing reviews to it. This avoids null `location_id` rows and keeps the audit trail intact.

### 13.13 Cross-Document Propagation

**Description:** This MVP.md restructure introduces decisions and schema changes that need to be reflected in the three working documents under `docs/phase-0/`. Reconcile each working document against the current MVP.md before Phase 1 implementation goes deep, updating the relevant content to remove contradictions.

**Working documents to reconcile:**

- **`docs/phase-0/CORE_SPECS.md`** — core product specification of Phase 1
- **`docs/phase-0/SECURITY_AUTH.md`** — security and authentication documentation
- **`docs/phase-0/IMPLEMENTATION_GUIDE.md`** — implementation guide

**Approach:** Read each working document. Update each one with content from MVP.md that falls within its scope (e.g., schema and product behavior into CORE_SPECS.md, signup flow and authentication changes into SECURITY_AUTH.md, build steps and operational notes into IMPLEMENTATION_GUIDE.md). MVP.md itself is the source of truth — the working documents should be reconciled against it, not the other way around. Surface any contradictions or unclear points back to the founder for decision rather than guessing.

**Note on archived documents:** The numbered docs in `docs/archive/phase-0-verbose/` (01_PRODUCT_ONE_PAGER.md, 02_PRD_MVP_PHASE1.md, etc.) are archived and should not be updated. They exist only as historical reference.

---

## 14. Validation Targets During Phase 1

These metrics must be tracked from day 1 because they drive Phase 2 pricing decisions and tier assignments at commercial launch:

- **Actual credits-per-response ratio per user.** The 2.0 estimate is unvalidated. Track real consumption to confirm or adjust.
- **Beta user usage patterns.** Per-user response volume, distinct active days, time of day, regeneration frequency — all of this informs which tier each beta user converts to at commercial launch.
- **Free vs. Beta signup ratio.** Are direct signups (no invite link) happening, and what's their engagement profile? This signals whether the closed beta is staying genuinely closed or whether the URL is leaking.
- **Founder-inquiry submission patterns.** Type breakdown (beta_request vs. more_credits vs. general), source (expired-link, Free-tier CTA, beta-user CTA), conversion to actual beta access or further engagement.
- **Sentiment quota usage.** Are users hitting sentiment limits? At which plan? The 1:5 ratio (response : sentiment) may need adjustment.
- **Multi-location requests.** When do beta users start asking for multi-location features? (Trigger threshold per PRICING_ROADMAP.md: 2 of 5 beta users explicitly request → build multi-location UI.)

PostHog event taxonomy (Section 13.9) captures these explicitly.

---

## 15. Beta User Recruitment Criteria

The first 5 beta users of the live MVP should match the following profile. This is the customer shape the MVP product is best equipped to serve, and feedback from these users will calibrate post-MVP pricing decisions (see PRICING_ROADMAP.md).

### Required Criteria

- Single-location operator OR small group (2–3 locations) willing to pilot on **one** location first
- Existing review response pattern shows visible "copy-paste / templated" behavior on Google reviews (verifiable signal of manual process; check before reaching out)
- 30–150 reviews/month at the pilot location
- Budget authority for $29–$79/month decisions without escalation (relevant for LOI conversation, not Phase 1 transactions)
- Willing to do 1-on-1 WhatsApp support during beta (per existing GTM plan)

### Excluded from Initial Beta

- Top-tier London restaurants/chains (300+ reviews/month, ~100% response rate). These are likely already using incumbent tools and represent a displacement sale, not a greenfield sale. Add to a separate watch list and revisit when Scale tier is built and case studies exist.
- Non-responding operators (e.g., some Indian restaurants observed in field research). Whether they buy this category at all is unvalidated. Run small research interviews before treating them as a target segment.
- 5+ location operators who refuse single-location pilot. These are rollout buyers, not pilot buyers — wrong customer for an early MVP.

### Pilot Framing

Beta onboarding script should set explicit expectations:

> "You're on our pre-launch beta. Multi-location support is on the roadmap. If you want to expand to your other locations before then, we'll work with you directly."

This converts a potential objection into a planned future conversation.

---

# PHASE 2 — COMMERCIAL LAUNCH (HIGH-LEVEL ONLY)

The sections below describe Phase 2 at high level only. Detailed implementation specifications will be added when the Phase 2 trigger fires (Phase 1 validation complete + operational prerequisites in place). Do not implement Phase 2 features during Phase 1.

---

## 16. Phase 2 Triggers, Prerequisites, and Action List

### 16.1 Trigger to Begin Phase 2

**Phase 1 validation complete and operational prerequisites in place.** Specifically:

- Customer signal from Phase 1 demonstrates demand (testimonials, Letters of Intent, observed engagement)
- Business registration completed (legal entity for receiving payments)
- Tax registration completed
- Stripe account active and configured

Until these are in place, Phase 2 work does not begin.

### 16.2 Prerequisites Before Building Phase 2

In order, before Phase 2 implementation work starts:

1. **Phase 1 validation complete** — sufficient customer signal (testimonials, Letters of Intent, engagement data) to justify commercial commitment
2. **Business entity registered** — appropriate legal form for receiving payments in the founder's jurisdiction
3. **Tax registration completed** — tax IDs issued as required by the registered jurisdiction
4. **Stripe account created and activated** with the registered business details — products and prices configured for the two packs (Starter pack $6, Growth pack $12) and two subscription tiers (Starter $29/month, Growth $79/month)
5. **Business bank account opened** in the registered business's name for Stripe payouts
6. **Tax advisor engaged** for ongoing accounting and tax compliance in the registered jurisdiction

These are external/legal/operational steps, not implementation work. They must be substantially complete before Phase 2 code work begins.

### 16.3 Phase 2 Implementation Action List (High-Level)

Each item below has a placeholder spec. Detailed specs (data models, API contracts, UI mockups, edge cases) will be added when Phase 2 begins.

**Stripe Foundation**

- **Stripe SDK integration:** install `stripe` Node SDK, create a singleton client wrapper, add API keys to Vercel environment variables (test keys for preview, live keys for production).
- **Webhook endpoint scaffolding:** create `/api/webhooks/stripe` route with signature verification using the webhook signing secret.
- **Local Stripe testing setup:** document Stripe CLI installation and webhook forwarding in the README.
- **Smoke test the integration:** manually trigger a test checkout session, verify webhook delivery and signature validation.

**Subscription Flows**

- **Stripe customer creation on first paid action:** when a Free user clicks upgrade (or a beta user converts during the grace period), create a Stripe customer and persist the `stripeCustomerId` on the User.
- **Subscription checkout (Free → Starter / Growth, or Beta → Starter / Growth):** Stripe Checkout session for the chosen tier; on successful return, update the user's tier and reset their credit/sentiment quotas to the new tier's amounts.
- **Tier change handling:** define and implement upgrade and downgrade behavior. Recommended: upgrade tops up to new tier amount immediately with anniversary unchanged; downgrade takes effect next anniversary.
- **Stripe webhook handlers:** listen for `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. Handle failed-payment retries and eventual auto-downgrade-to-Free if payment ultimately fails.
- **Subscription cancellation flow:** cancel from settings; subscription stays active until end of billing period, then auto-downgrades to Free.

**Credit Pack Purchase**

- **Pack purchase API + Stripe one-time payment:** endpoint creates a Stripe one-time charge for the appropriate tier-specific pack (Starter pack $6 or Growth pack $12); on success, atomically increments both response credits and sentiment quota by the pack's amounts (Starter: +5 / +25; Growth: +10 / +50) in a single transaction.
- **Pack purchase modal UI:** shows bundled contents, price, and upcoming reset date informationally per Section 6 (no conditional within-3-days messaging, no pattern-based upgrade suggestions in the modal).
- **Pack purchase logging in Credit Usage History:** paired entries (response addition + sentiment addition) linked by shared transaction ID.
- **Block packs on Free tier** (API + UI).

**Phase Transition**

- **Phase flag flip:** flip `current_phase` from `phase_1` to `phase_2`. New signups stop receiving `is_beta_user: true`. Pricing page banner replaced with live tier selection.
- **Beta-to-paid grace period:** existing beta users get **60 days** from the phase flip to either upgrade to a paid tier (Starter or Growth) or revert to Free tier. Communication to beta users includes a tier recommendation based on their actual usage data from Phase 1 (per validation targets in Section 14). See template in 16.4.
- **Differentiated zero-balance dialog (Phase 2 mode):** Free users see "Upgrade to Starter / Growth" buttons. Starter users see "Upgrade to Growth" AND "Buy 5 credits ($6)". Growth users see "Buy 10 credits ($12)". Beta users still on grace period see their existing CTAs plus a soft prompt to convert.

**Pricing Page Activation**

- **Activate live tier selection:** remove "Closed beta" banner, enable Stripe checkout buttons on tier cards.
- **Pricing page must:**
  - Display credits as the primary unit (no response-equivalent translations — see Section 5)
  - Show credit packs as a separate section (not buried in FAQ)
  - Describe each pack as a bundle of both credit types ("Starter pack: 5 response credits + 25 sentiment credits, $6"; "Growth pack: 10 response credits + 50 sentiment credits, $12") — never as response credits alone
  - Make clear that pack purchase is available only to Starter and Growth subscribers (not Free)
  - Make clear that all credits (tier + pack, both types) reset on the subscription anniversary
  - Avoid promising features not in MVP

**Observability**

- **PostHog events:** add `tier_upgrade_initiated`, `tier_upgrade_completed`, `pack_purchase_initiated`, `pack_purchase_completed`, `subscription_cancelled`, `beta_to_paid_converted`, `beta_to_free_reverted`.
- **Sentry coverage:** Stripe webhook failures, pack atomic transaction failures, tier mismatch states (subscription says Growth but DB says Starter).

### 16.4 Beta-to-Paid Grace Period Communication

Tone matters. The communication when Phase 2 begins is not transactional — it's a thank-you with a path forward.

Reference template:

> **Beta program transitioning to commercial launch — what happens next**
>
> Thank you for being part of the BrandsIQ pre-launch beta. As we transition to commercial launch, you have **60 days** to choose a paid tier and continue using BrandsIQ as you have been. Your usage history, brand voice, and review history all carry over — nothing changes about your data.
>
> If you don't upgrade within 60 days, your account will move to the Free tier (15 response credits/month). You won't lose anything, but the higher allocation you've had during beta will end.
>
> Based on your usage during the beta, the recommended plan for you is **[tier name]** at **$[price]/month**. Click below to upgrade, or reach out if you'd like to discuss.
>
> [Upgrade to Recommended Tier] [View All Plans] [Talk to Founder]

The tier recommendation is generated from the per-user usage data captured during Phase 1 — average monthly response credits consumed determines whether they're a Starter (≤30 credits/month average) or Growth (>30 credits/month average) candidate.

---

## 17. Cross-References

- **PRICING_ROADMAP.md** — Post-MVP pricing roadmap: Scale/Enterprise tier design, multi-location feature bundling, credit pack evolution, anti-patterns
- **BETA_ENGAGEMENT_PLAYBOOK.md** — Operational playbook for beta engagement: per-customer timeline, testimonial and LOI conversations, founder-side calendar
- **`docs/phase-0/CORE_SPECS.md`** — core product specification of Phase 1 (working doc — reconcile with this MVP.md per Section 13.13)
- **`docs/phase-0/SECURITY_AUTH.md`** — security and authentication documentation (working doc — reconcile with this MVP.md per Section 13.13)
- **`docs/phase-0/IMPLEMENTATION_GUIDE.md`** — implementation guide (working doc — reconcile with this MVP.md per Section 13.13)
- **DOCUMENTATION_ROADMAP.md** — Overall doc structure and phasing
- Archived numbered docs in `docs/archive/phase-0-verbose/` are historical reference only — do not update

---

## 18. Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-05 | 3 commercial tiers for MVP (Free, Starter, Growth) | Premature to add Scale/Enterprise without product-market fit |
| 2026-01-05 | Credits, not responses, as billing unit | Easier to measure, easier to raise quotas, honest API metering |
| 2026-04-25 | One-axis pricing (credits only) | Customers should pay for AI work done, not for org dimensions |
| 2026-04-25 | Data model supports multi-location from day 1 | Avoids expensive refactor when multi-location UI ships post-MVP |
| 2026-04-25 | Credit packs, not per-response overages | Simpler mental model, handles volume spikes without tier churn |
| 2026-04-25 | Pack pricing: 10 credits for $12 ($1.20/credit) | Higher per-credit rate than any tier preserves upgrade incentive |
| 2026-04-26 | Pack is a bundle: 10 response + 50 sentiment, $12 | Mirrors tier upgrade behavior; sentiment bundled at marginal cost |
| 2026-04-25 | All credits expire at subscription anniversary | Matches monthly-SaaS industry norm; single rule, single bucket |
| 2026-04-25 | Credit packs not available on Free tier | Free tier should drive upgrades, not be viable indefinite plan |
| 2026-04-25 | MVP enforces 1 location per account at UI level | Single-location pilot is the right beta evaluation posture |
| 2026-04-25 | No credit-to-response equivalents shown in product | The 2-credit/response figure varies by user behavior |
| 2026-05-01 | Two-phase implementation: Phase 1 (Pre-Launch Beta) and Phase 2 (Commercial Launch) | Validate product-market fit through free closed beta before committing to business registration and payment infrastructure |
| 2026-05-01 | Beta plan: 150 response credits + 750 sentiment credits per month, anniversary reset | Generous enough for unconstrained validation; tight enough that high-volume customers surface as Scale signal |
| 2026-05-01 | Beta identification: invite links (one-time use, 60-day expiry) | Matches push-based GTM (DMs); link carries identity, no manual flag-flipping |
| 2026-05-01 | Expired/invalid beta link: clear error page with embedded form to request fresh invite + option to continue at Free tier | Silent fallback creates worse UX for genuine beta prospects |
| 2026-05-01 | Profile registration with mandatory + optional fields; review volume field dropped | Self-reported volume data unreliable; better captured via PostHog usage data |
| 2026-05-01 | Unified founder-inquiry form for expired-link recovery, beta access requests, and request-more-credits | Single component, single email notification mechanism, single admin view |
| 2026-05-01 | Beta-to-paid grace period: 60 days flat | Recognizes beta contribution (longer than LOI's 30-day window); simple rule for all beta users |
| 2026-05-01 | Phase transition controlled by `current_phase` system flag | Single switch flips signup behavior, pricing page banner, and zero-balance dialog mode together |
| 2026-05-01 | Cross-document propagation added as Phase 1 task (Section 13.13) | Other project docs (PRD, data model, API contracts, security, GDPR, auth, CI/CD guide) predate this restructure and need reconciliation before Phase 1 implementation goes deep |
| 2026-05-02 | Strategic rationale in Section 2 depersonalized; Phase 2 trigger reframed as "Phase 1 validation complete + operational prerequisites in place" | MVP.md is shared with Claude Code and possibly others; founder-personal context (visa, jurisdiction-specific terms) is not appropriate in product spec |
| 2026-05-02 | Pricing page banner uses action-oriented framing ("BrandsIQ is currently in closed beta. [Request beta access →]") with no specific launch date promised | Committing to a launch date that may slip causes more trust damage than vague-but-honest framing |
| 2026-05-02 | Two tier-proportional packs at equal $1.20/credit rate: Starter pack 5/25 at $6, Growth pack 10/50 at $12 | Right-sizes financial commitment to each tier (each pack ~17% of monthly tier allocation); equal per-credit rate is fairer than premium-on-Starter without changing real upgrade pressure |
| 2026-05-02 | Pack purchase modal removes within-3-days-of-reset conditional logic and pattern-based upgrade suggestions | Reset date displayed informationally is sufficient; conditional UX adds complexity without driving real upgrade signal; pattern-based upgrade nudges (if added later) belong in dashboard or email surfaces, not the pack purchase flow |
| 2026-05-02 | Cross-document propagation task simplified to point at three working docs in `docs/phase-0/` (CORE_SPECS, SECURITY_AUTH, IMPLEMENTATION_GUIDE) | Earlier list referenced archived numbered docs; the active working set is consolidated and Claude Code can route content to the right working doc without explicit content-to-file mapping |
| 2026-06-03 | Free tier allocation lowered from 15/35 to 5/25 (response/sentiment credits per month) | After reviewing real-business review volumes, the Free allocation was too generous to function as a trial-to-paid funnel; tightening it strengthens the upgrade signal. Starter, Growth, and the Beta plan are unchanged. No active users, so no data migration. |

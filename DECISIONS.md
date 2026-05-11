# BrandsIQ Technical Decisions

**Purpose:** Document all significant technical decisions, architectural choices, and deviations from original specifications.

**Last Updated:** April 22, 2026

---

## Decision Framework

When documenting decisions, include:
- **What:** The decision made
- **Why:** Reasoning behind the decision
- **Alternatives:** What other options were considered
- **Trade-offs:** Pros and cons
- **Impact:** How this affects the project
- **Source:** Where this was specified (or if it's a deviation)
- **Date:** When the decision was made
- **Risk Level:** Low ✅ | Medium ⚠️ | High 🚨

---

## Table of Contents

1. [Phase 0: Documentation Decisions](#phase-0-documentation-decisions)
2. [Prompt 0: Planning & Architecture](#prompt-0-planning--architecture)
3. [Prompt 1: Project Setup](#prompt-1-project-setup)
4. [Prompt 2: Database](#prompt-2-database)
5. [Prompt 3: Authentication](#prompt-3-authentication)
6. [Prompt 4: Dashboard & UI](#prompt-4-dashboard--ui)
7. [Prompt 5: Review Management](#prompt-5-review-management)
8. [Prompt 6: Brand Voice](#prompt-6-brand-voice)
9. [Prompt 7: AI Response Generation](#prompt-7-ai-response-generation)
10. [Prompt 8: Sentiment Analysis](#prompt-8-sentiment-analysis)
11. [Prompt 9: Credit System](#prompt-9-credit-system)
12. [Prompt 10: Testing & Deployment](#prompt-10-testing--deployment)
13. [Deviations from Specifications](#deviations-from-specifications)

---

## Phase 0: Documentation Decisions

### Credit-Based Pricing Model
- **Decision:** Use credit-based pricing instead of review-based pricing
- **Why:** Aligns costs with actual AI usage, prevents abuse, clearer value metric
- **Alternatives:** Per-review pricing, unlimited usage tiers
- **Source:** 01_PRODUCT_ONE_PAGER.md
- **Date:** January 5, 2026
- **Impact:** Requires credit tracking system, fraud prevention
- **Risk Level:** Low ✅

### Separate Sentiment Quota
- **Decision:** DeepSeek API for sentiment with separate quota from response credits
- **Why:** DeepSeek is 10x cheaper than Claude, enables more sentiment analyses
- **Alternatives:** Use Claude for sentiment (expensive), skip sentiment analysis
- **Source:** 01_PRODUCT_ONE_PAGER.md
- **Date:** January 5, 2026
- **Impact:** Need separate quota tracking, two API integrations
- **Risk Level:** Low ✅

### Three-Tier Pricing (No Enterprise)
- **Decision:** FREE, STARTER, GROWTH tiers only - no Enterprise tier for MVP
- **Why:** Enterprise needs features we don't have yet (SSO, white-label, SLA)
- **Alternatives:** Launch with placeholder Enterprise tier
- **Source:** 01_PRODUCT_ONE_PAGER.md
- **Date:** January 5, 2026
- **Impact:** May miss some enterprise leads initially
- **Risk Level:** Low ✅

### Manual Input Before Integrations
- **Decision:** Start with manual review input, add CSV then API integrations
- **Why:** Faster MVP validation, CSV covers most use cases
- **Alternatives:** Build Google integration first
- **Source:** 02_PRD_MVP_PHASE1.md
- **Date:** January 5, 2026
- **Impact:** Slower initial growth but faster to market
- **Risk Level:** Low ✅

---

## Prompt 0: Planning & Architecture

*Decisions to be added after completing Prompt 0*

**Expected Decisions:**
- Final tech stack validation
- Folder structure confirmation
- Integration strategy refinements
- Timeline adjustments based on complexity


**Result**
1. Significant Technical Decisions
Decision	Reason
NextAuth.js v5 (beta)	Better App Router support; newer patterns; will be stable soon
Prisma over raw SQL	Type safety; migrations; developer experience
DeepSeek for sentiment	10x cheaper than Claude; good enough accuracy for classification
shadcn/ui over custom components	Production-ready; accessible; highly customizable
JWT sessions over database sessions	Faster reads; less DB load; good for MVP scale
Separate sentiment quota	Cost optimization; allows generous free tier
franc-min for language detection	Lightweight; supports 40+ languages; runs client & server
Resend over SendGrid/SES	Modern API; great DX; generous free tier
2. Deviations from Phase 0 Specifications
None for Prompt 0 - This is the planning phase, no implementation yet.

Note: The Phase 0 specs are well-designed. Potential future deviations will be documented as they occur in subsequent prompts.

---

## Prompt 1: Project Setup

*Decisions to be added after completing Prompt 1*

**Potential Decisions:**
- Node.js version (18.x vs 20.x)
- Package manager (npm vs yarn vs pnpm)
- UI component library versions
- Development tooling choices

1. Significant Technical Decisions
Decision	Reason
Next.js 14.2.35 (not 15)	Stable version; NextAuth v5 beta has better compatibility with 14.x
Manual project setup	Existing docs folder required careful integration vs. create-next-app
Tailwind 3.4 (not 4.x)	Better shadcn/ui compatibility; Tailwind v4 is still in beta
ESLint 8.x	Next.js 14 uses ESLint 8; v9 has breaking changes
React 18.x	Stable version; React 19 not needed for this project
Geist font	Modern, professional font from Vercel; good for SaaS
Sonner for toasts	Better DX than react-hot-toast; shadcn compatible
Manual shadcn components	CLI can be unreliable; manual gives more control
Custom badge variants	Added positive/neutral/negative for sentiment display
Removed postinstall script	Prisma generate fails without full schema; will add back in Prompt 2
2. Deviations from Phase 0 Specifications
Spec Said	Implemented	Why	Risk
next.config.ts	next.config.mjs	Next.js 14 doesn't support .ts config files	None
npx shadcn-ui@latest add CLI	Manual component creation	CLI can be unreliable; manual approach is more predictable	Low
postinstall: "prisma generate"	Removed	Prisma fails without full schema; will restore in Prompt 2	None
Full Prisma schema	Placeholder schema	Full schema is Prompt 2 scope	None - intentional


---

## Prompt 2: Database

*Decisions to be added after completing Prompt 2*

**Potential Decisions:**
- ID generation strategy (CUID vs UUID)
- Soft delete implementation details
- Index optimization choices
- Database pooling configuration

1. Significant Technical Decisions
Decision	Reason
Prisma 5.22.0 (not 7.x)	Prisma 7 has breaking changes requiring config files for url; v5 is stable
Direct database URL	Supabase pooler URL had "Tenant not found" errors; direct URL works reliably
db push instead of migrate	Better for initial development; migrations should be used for production
Atomic transactions for credits	Prevents race conditions when deducting credits; ensures data integrity
Separate audit tables	GDPR compliance - audit trails survive data deletion
Cascading deletes on User	When user is deleted, all related data is deleted (GDPR right to deletion)
SetNull for audit references	Audit trails preserved when reviews/responses are deleted
Re-export Prisma types	Single source of truth for database types
2. Deviations from Phase 0 Specifications
Spec Said	Implemented	Why	Risk
Prisma 5.x	Prisma 5.22.0	Spec said 5.x, used latest stable 5.x	None
migrate dev --name init	db push	Faster for initial setup; migrate for production	Low
Supabase pooler URL format	Direct database URL	Pooler had authentication errors with project-ref username format	Low
URL-encoded password in pooler	Direct URL with simple username	Pooler format postgres.projectref:pass didn't work	Low

---


## Prompt 3: Authentication

*Decisions to be added after completing Prompt 3*

**Potential Decisions:**
- Session strategy (JWT vs database sessions)
- Session duration (30 days per spec)
- Password hashing cost factor (12 per spec)
- OAuth providers order of implementation
- Rate limiting thresholds

**From Specification:**
These are NOT decisions (they're specified), but document here for reference:
- JWT session strategy (per 07_AUTHENTICATION_SYSTEM.md line 147)
- bcrypt cost factor 12 (per 06_SECURITY_PRIVACY.md line 89)
- 30-day session duration (per 07_AUTHENTICATION_SYSTEM.md line 149)
- Rate limit: 5 attempts/15 minutes (per spec)

---
1. Significant Technical Decisions
Decision	Reason
NextAuth v5 (beta) over v4	Better App Router integration, improved TypeScript support, new auth() function for middleware
JWT session strategy	Stateless authentication, 30-day sessions, reduced database load
In-memory rate limiting fallback	Allows development without Upstash Redis while still providing rate limiting
bcryptjs (pure JS)	Works in all environments including Edge, no native compilation
Suspense boundaries	Required by Next.js 14 for pages using useSearchParams during static generation
Split auth config	Moved config to src/lib/auth.ts for better organization and testability
2. Deviations from Phase 0 Specifications
Spec Said	Implemented	Why	Risk
withAuth middleware	Custom middleware using auth()	NextAuth v5 deprecates withAuth	Low
Upstash Redis required	In-memory fallback when Redis not configured	Better DX for local development	Low
No password strength UI	Added visual indicator with checklist	Better UX	None
Fewer auth pages	Added /forgot-password, /reset-password, /verify-email, /error	Complete auth flow	None


## Prompt 4: Dashboard & UI

*Decisions to be added after completing Prompt 4*

**Potential Decisions:**
- Color scheme and branding
- Component library usage patterns
- Responsive breakpoints
- Navigation structure
- Empty state designs

---
1. Significant Technical Decisions
Decision	Reason
Client-side layout with useSession	Changed from server component to client component for the dashboard layout to enable real-time updates of credit balance and mobile menu state management
Separate API endpoint for dashboard stats	Created /api/dashboard/stats instead of embedding data in the layout to enable data refresh without full page reload and keep layout lightweight
QuotaCard vs StatsCard separation	Split into two components - QuotaCard shows progress bars with reset dates (for credits/sentiment), StatsCard shows simple metrics with trends
Mobile sidebar using Sheet component	Used shadcn/ui Sheet for mobile navigation instead of custom drawer for consistency and accessibility
Toast notifications via Sonner	Sonner was already set up in Prompt 1; leveraged it for error notifications on dashboard load failures
Tier limits aligned to CORE_SPECS.md	Updated constants to match spec (FREE: 15 credits, 35 sentiment instead of earlier values of 5/10)
2. Deviations from Phase 0 Specifications
Spec Said	What I Implemented	Why	Risk
"Navbar.tsx" as separate component	Integrated into DashboardHeader	The header IS the top navigation bar; creating separate file would be redundant	Low - same functionality
No specification for loading states	Added skeleton loading states	Better UX while data fetches	None - enhancement
Review detail page link	Links to /dashboard/reviews/[id] (not yet implemented)	Following spec's planned route structure	Low - page will be built in Prompt 5


## Prompt 5: Review Management

*Decisions to be added after completing Prompt 5*

**Potential Decisions:**
- Language detection library (franc vs alternatives)
- Filter implementation approach
- Pagination strategy
- Search implementation (client vs server)

---
1. Significant Technical Decisions and Reasons
Decision	Reason
Fallback sentiment analysis	DeepSeek API may not always be available or configured. Added keyword-based fallback that works without API key, ensuring sentiment is always analyzed.
Zod v4 .issues instead of .errors	Zod v4 changed the error structure. Updated API routes to use .issues for accessing validation errors.
Debounced language detection (500ms)	Avoids excessive language detection calls while user is typing. Only detects after user pauses for 500ms.
Language detection confidence threshold	Text < 10 chars defaults to English with "low" confidence. Text >= 50 chars gets "high" confidence. This helps users know when to verify/override.
Duplicate review prevention (5-minute window)	Prevents accidental double-submission by checking for same userId + reviewText within 5 minutes.
Sentiment quota check before analysis	Respects user's monthly quota; if exceeded, review is still created but sentiment is null with a warning message.
Cascade delete with audit trail preservation	Review deletion cascades to response/versions (Cascade), but CreditUsage and SentimentUsage keep their records (SetNull) for audit purposes.
RTL language support in UI	Arabic, Hebrew, Persian, Urdu display right-to-left using dir attribute on text containers.
Platform filter uses exact match	Filters use the exact platform string from constants rather than case-insensitive matching for consistency.
![alt text](image.png)

2. Deviations from Phase 0 Specifications
Spec Said	Implemented	Why Deviated	Impact/Risk
API base URL /api/v1	Used /api (no version prefix)	Next.js App Router convention; versioning can be added later if needed	Low - easy to add /v1 prefix later
DeepSeek required for sentiment	Made DeepSeek optional with fallback	Allows testing without API key; ensures feature works even if API is down	Low - fallback has lower accuracy but is functional
Sentiment cost 0.3 credits	Sentiment counts against separate sentimentCredits balance (1 analysis = 1 sentimentCredit), not response credits. **Superseded Jan 20, 2026:** originally `sentimentUsed`/`sentimentQuota`; standardized to balance model — see "Schema Change: Sentiment Credits Standardization".	Separate balance matches response-credit pattern; quota sized per tier (35/150/500)	None - follows schema design
externalId and externalUrl in create	Available in schema but not in create form UI	These are for future platform integrations (CSV import), not manual entry	Low - can add to form when needed

![alt text](image-1.png)

## Prompt 6: Brand Voice

*Decisions to be added after completing Prompt 6*

**Potential Decisions:**
- Tone preset definitions
- Formality scale interpretation
- Sample response storage format
- Brand voice prompt engineering approach

### 1. Technical Decisions Made

| Decision | Reason |
|----------|--------|
| Used claude-sonnet-4-20250514 model | Latest Claude Sonnet model for response generation as specified in CORE_SPECS |
| Created separate /api/brand-voice/test endpoint | Allows users to test brand voice without credit deduction |
| Prefixed callback params with underscore in interfaces | Silences ESLint warnings for unused parameters in type definitions |
| Used upsert for brand voice updates | Handles both create and update in single operation |
| Added default brand voice creation in GET endpoint | Ensures users always have brand voice settings available |
| Built modular UI components | ToneSelector, FormalitySlider, etc. can be reused in future features |
| Added retry logic with exponential backoff | Handles transient Claude API errors (429 rate limit, 529 overloaded) with up to 3 retries |
| Strengthened key phrase instruction in prompt | Changed from "include when appropriate" to "REQUIRED... MUST incorporate 1-2" for better adherence |
| Added formality descriptions to UI | Shows user-friendly descriptions like "Balanced mix of professional and approachable" below slider |
| **Implemented auto-save with debounce** | **Better UX - changes save automatically after 1.5s of inactivity, no manual save button needed** |
| Replaced textarea with structured list for Style Guidelines | Better UX - each guideline as separate input field, numbered list, add/remove buttons |
| JSON serialization for style guidelines | Safer than newline-separated; handles special characters; backward compatible with legacy format |
| Style Guidelines limits: 5 max, 200 chars each | Reasonable limits to keep prompts focused; can be increased if needed |
| **CollapsibleTextItem reusable component** | **Unified UX for Style Guidelines and Sample Responses: read-only by default, edit on click, collapsible (max 3 lines), expand on click** |

### 2. Deviations from Phase 0 Specifications

| Spec | Implementation | Why | Risk |
|------|----------------|-----|------|
| Spec had 4 tones: friendly/professional/casual/formal | Implemented: professional/friendly/casual/empathetic | "empathetic" is more useful for review responses than "formal" (covered by formality slider). CORE_SPECS also mentions "empathetic" in tone options | Low ✅ |
| Spec mentioned avoidPhrases and signatureClosing in validation schema | Not implemented in UI | These were in a previous validation schema but not in the Prisma BrandVoice model. Can be added later if needed | Low ✅ |
| Manual "Save Changes" button | Auto-save with status indicator | Improves UX - users don't need to remember to click save, changes persist automatically | Low ✅ |

### 3. Key Implementation Details

**Auto-Save Feature:**
- 1.5 second debounce delay prevents excessive API calls
- Visual status indicator: "Saved" (green cloud), "Unsaved" (yellow cloud-off), "Saving..." (spinner)
- Prevents data loss from users forgetting to save
- `isInitialized` flag prevents auto-save on initial page load

**Retry Logic for Claude API:**
- Exponential backoff: 1s → 2s → 4s between retries
- Only retries on transient errors (429 rate limit, 529 overloaded)
- Logs retry attempts for debugging

**Formality Descriptions (UI):**

| Level | Label | Description |
|-------|-------|-------------|
| 1 | Very Casual | Very casual and conversational, like talking to a friend |
| 2 | Casual | Casual but still polite and friendly |
| 3 | Balanced | Balanced mix of professional and approachable |
| 4 | Formal | Formal and professional with proper business language |
| 5 | Very Formal | Very formal, polished, and highly professional |

**Style Guidelines (Structured List Input):**
- Replaced free-form textarea with numbered list of individual input fields
- Each guideline can be added, edited in-place, or removed
- Max 5 guidelines, 200 characters each
- Stored as JSON array in database string field (backward compatible)
- New `StyleGuidelinesInput` component created for reusability

**CollapsibleTextItem Component (Unified UX for Style Guidelines & Sample Responses):**
- Created reusable `CollapsibleTextItem` component for consistent behavior
- Features:
  - **Read-only by default**: Items display as text, not editable fields
  - **Edit on click**: Pencil icon or card click enters edit mode
  - **Collapsible view**: Shows max 3 lines when collapsed (configurable)
  - **Expand on click**: Chevron button to expand/collapse long content
  - **Multiline support**: Both Style Guidelines and Sample Responses now support multiline text
  - **Keyboard shortcuts**: Ctrl+Enter to save, Escape to cancel
- Applied to both `StyleGuidelinesInput` and `SampleResponsesInput` components
- `maxCollapsedLines` prop allows customization per use case

---

## Prompt 7: AI Response Generation

### 1. Technical Decisions Made

| Decision | Reason |
|----------|--------|
| Used existing Claude service from Prompt 6 | Reused the generateReviewResponse function, adding toneModifier parameter for regeneration |
| Tone modifier as optional parameter | Default behavior uses brand voice tone; modifier overrides for regeneration |
| Non-streaming API calls | Simpler implementation; responses are short (<500 chars); streaming adds complexity without significant UX benefit |
| Response truncation with sentence boundary | If AI generates >500 chars, truncates at last period after char 400 to avoid mid-sentence cuts |
| Atomic credit deduction in transaction | Uses existing deductCreditsAtomic from db-utils; prevents race conditions |
| Version history preserves pre-edit state | Before each edit, current text is saved to history; allows restoration of any previous version |
| 0 credits for manual edits | Edits don't consume credits since they don't use AI |
| ResponsePanel component approach | Single component manages all response actions (view, edit, regenerate, copy, delete) |
| In-place editing | Edit mode replaces response display with textarea rather than modal |
| ToneModifier as dialog | Prevents accidental regeneration; shows credit cost; allows tone selection |
| Collapsible version history | Reduces visual clutter; expands on demand |
| Restore version without creating duplicates | Restoring a version updates current response without creating new version entry (version already exists in history) |
| Generate button in review card header | Primary action prominently placed; tooltip shows credit cost |
| ResponsePanel hidden when no response | Avoids duplicate "Generate" buttons; panel only appears after response exists |

### 2. Deviations from Phase 0 Specifications

| Spec | Implementation | Why | Risk |
|------|----------------|-----|------|
| Spec said 200 max tokens | Using 500 max tokens | 500 chars for response text limit requires more tokens; 200 tokens ~150 words would be too limiting | Low - costs slightly more but better output |
| Spec mentioned separate generate page | Generate page exists AND ResponsePanel inline | Both options available - page for initial generation, panel for subsequent actions | None - more flexible |
| Spec mentioned version restore | Added restore version functionality | Useful feature for users who want to undo regeneration | None - enhancement |
| Publishing marks "approved" not "published externally" | isPublished = true marks as approved/ready to copy | True external publishing requires platform integrations (Phase 3) | Low - terminology clarified in UI |

### 3. Key Implementation Details

**API Endpoints Created:**
- `POST /api/reviews/[id]/generate` - Generate initial response (1.0 credit, NO version entry)
- `POST /api/reviews/[id]/regenerate` - Regenerate with tone modifier (1.0 credit, saves old text to history first)
- `PUT /api/reviews/[id]/response` - Manual edit or restore version (0 credits)
- `POST /api/reviews/[id]/publish` - Mark as approved

**Credit Costs:**
- Initial generation: 1.0 credits
- Regeneration: 1.0 credits
- Manual edit: 0 credits
- Restore version: 0 credits

**Version History Behavior:**
Version history only stores PREVIOUS versions (what the response used to be), not the current response.
- **Generate**: Creates response only. NO version entry. Sets `ReviewResponse.creditsUsed = 1`
- **Regenerate**: Saves OLD text to history (preserving its creditsUsed), then updates response. Sets `ReviewResponse.creditsUsed = 1`
- **Manual Edit**: Saves OLD text to history (preserving its creditsUsed), then updates response. Sets `ReviewResponse.creditsUsed = 0`
- **Restore**: Updates response to restored text/tone WITHOUT creating new version (version already exists in history)

**Version History Credit Display:**
The `creditsUsed` field tracks whether a version was AI-generated (1) or manually edited (0):
- When saving to history, we preserve `review.response.creditsUsed` (what the current response cost)
- After a manual edit, we set `ReviewResponse.creditsUsed = 0` so future history entries show 0 credits
- After generate/regenerate, `ReviewResponse.creditsUsed = 1` so future history entries show 1 credit

**Generated Badge Display:**
The `isEdited` field tracks whether a response/version was AI-generated (false) or manually edited (true):
- When saving to history, we preserve `review.response.isEdited` (whether the current response was edited)
- After a manual edit, we set `ReviewResponse.isEdited = true`
- After generate/regenerate, `ReviewResponse.isEdited = false`
- UI shows "Generated" badge (blue, with Sparkles icon) when `isEdited = false`
- UI shows "Edited" badge (outline) when `isEdited = true`

Example flow:
1. Generate (1 credit) → v1, `creditsUsed=1`, `isEdited=false` → shows "Generated" badge
2. Edit → saves v1 to history with `creditsUsed=1`, `isEdited=false`, response becomes `creditsUsed=0`, `isEdited=true`. History: {v1(1 credit, Generated)}
3. Edit → saves v2 to history with `creditsUsed=0`, `isEdited=true`, response stays `creditsUsed=0`, `isEdited=true`. History: {v2(Edited), v1(1 credit, Generated)}
4. Regenerate (1 credit) → saves v3 to history with `creditsUsed=0`, `isEdited=true`, response becomes `creditsUsed=1`, `isEdited=false`. History: {v3(Edited), v2(Edited), v1(1 credit, Generated)}
5. Edit → saves v4 to history with `creditsUsed=1`, `isEdited=false`, response becomes `creditsUsed=0`, `isEdited=true`. History: {v4(1 credit, Generated), v3(Edited), v2(Edited), v1(1 credit, Generated)}

**Total Credits Used Per Review (Added January 18, 2026):**
The `totalCreditsUsed` field is calculated by summing:
- Current response's `creditsUsed` (credits for the current/latest generation)
- All version history `creditsUsed` (credits for each previous generation/regeneration)

Formula: `totalCreditsUsed = response.creditsUsed + sum(versions.creditsUsed)`

Example:
- Initial generation: 1 credit → total = 1
- After 1 regeneration: 1 credit (current) + 1 credit (version 1) → total = 2
- After 2 regenerations: 1 credit (current) + 1 credit (version 1) + 1 credit (version 2) → total = 3

Edits don't consume credits (creditsUsed = 0), so they don't increase the total.

This is displayed in:
- Review list page: next to "AI Response:" label
- Review details page: in the AI Response card header

**Tone Modifiers:**
- `professional` - Business-like, courteous, maintaining formal tone
- `friendly` - Warm, personable, like helping a friend
- `empathetic` - Understanding, compassionate, showing genuine care

**UI Components Created:**
- `ResponsePanel` - Main response display with all actions
- `ResponseEditor` - Inline text editor with char counter
- `ToneModifier` - Dialog for selecting regeneration tone
- `ResponseVersionHistory` - Collapsible version list

---

## Prompt 8: Sentiment Analysis

### 1. Technical Decisions Made

| Decision | Reason |
|----------|--------|
| DeepSeek Chat model (deepseek-chat) | Cost-effective sentiment classification; 10x cheaper than Claude for this task |
| 3-class sentiment (positive/neutral/negative) | Simpler classification is sufficient for review analysis; avoids false precision |
| Keyword-based fallback | When DeepSeek API unavailable, uses comprehensive keyword matching for sentiment |
| Low temperature (0.1) | Ensures consistent classification; reduces randomness in sentiment results |
| Separate quota from credits | Sentiment uses its own quota (35/150/500 per tier) independent of response credits |
| Non-blocking sentiment analysis | Review creation succeeds even if sentiment API fails; sentiment is "nice to have" |
| Stacked bar chart for distribution | Visual, intuitive display of sentiment breakdown; familiar pattern |
| Sentiment badges with colors | Green for positive, gray for neutral, red for negative; universal color coding |

### 2. Deviations from Phase 0 Specifications

| Spec | Implementation | Why | Risk |
|------|----------------|-----|------|
| Spec mentioned batch analysis | Not implemented | Manual review input doesn't need batch; will add for CSV import in Phase 2 | Low - deferred to appropriate phase |
| Spec mentioned cron job for quota reset | Implemented (Feb 2026) | Cron endpoint created at `/api/cron/reset-credits`; scheduled daily via `vercel.json` | Low ✅ |
| No backfill after credit reset | By design | Reviews with `sentiment: null` remain unchanged after credit reset; backfill deferred to Phase 2 with batch analysis | Low ✅ |
| Sentiment emoji badges | Text-only badges | Cleaner UI; emojis can be distracting in professional context | None - preference |

### 3. Key Implementation Details

**DeepSeek API Integration:**
- Uses `https://api.deepseek.com/v1/chat/completions` endpoint
- Model: `deepseek-chat` (fast, cheap)
- Temperature: 0.1 for consistent results
- Max tokens: 10 (only need one word: positive/neutral/negative)
- 10 second timeout to avoid blocking

**Fallback Sentiment Analysis:**
- Activated when DEEPSEEK_API_KEY not set or API errors
- Uses 40+ positive keywords (great, excellent, amazing, etc.)
- Uses 40+ negative keywords (terrible, awful, worst, etc.)
- Compares keyword counts to determine sentiment
- Returns 0.6 confidence (vs 0.9 for API)

**API Endpoints Created:**
- `GET /api/sentiment/usage` - Sentiment usage history with distribution stats

**Dashboard Integration:**
- `SentimentDistributionCard` component shows stacked bar chart
- Distribution percentages calculated: positive%, neutral%, negative%
- Shows total analyzed reviews count

**Quota Tracking (Updated January 20, 2026):**
- `user.sentimentCredits` stores remaining sentiment credits (balance model)
- `user.sentimentResetDate` stores next reset date
- `SentimentUsage` table logs each analysis for audit trail
- Note: Previously used `sentimentUsed` + `sentimentQuota` (usage model), now standardized to balance model

**No Backfill on Credit Reset (Documented February 4, 2026):**
When credits are reset after 30 days, reviews that were created without sentiment analysis (due to exhausted credits) are **NOT automatically re-analyzed**. This is by design:

| Timeline | Event | Result |
|----------|-------|--------|
| Day 1 | User adds Review A | Sentiment analyzed ✓ |
| Day 15 | Sentiment credits exhausted | - |
| Day 16 | User adds Review B | `sentiment: null`, shows "Sentiment ⚠" indicator |
| Day 30 | Credit reset | User gets fresh credits, **Review B still has `sentiment: null`** |
| Day 31 | User adds Review C | Sentiment analyzed ✓ |

**Rationale:**
1. **Simplicity**: Automatic backfill adds complexity (batch processing, rate limiting, error handling)
2. **Cost predictability**: Users know exactly what they're paying for - analysis at creation time
3. **Deferred to Phase 2**: Batch analysis feature will be added alongside CSV import, which has similar batch processing needs
4. **User visibility**: "Sentiment ⚠" indicator clearly shows which reviews weren't analyzed

---

## Prompt 9: Credit System

### 1. Technical Decisions Made

| Decision | Reason |
|----------|--------|
| Reused existing credit infrastructure | Most credit system was already built in Prompts 5-8 (deductCreditsAtomic, CreditUsage tracking, QuotaCard display) |
| GET /api/credits endpoint | Dedicated endpoint for fetching credit balance; reuses logic from dashboard/stats but focused on credits only |
| GET /api/credits/usage with pagination | Paginated endpoint (20 records default, max 100) with date range and action filters |
| Credit usage CSV export | Client-side CSV generation for user data export; no server-side file storage needed |
| LowCreditWarning component | Dismissible alert banner when credits < 3; shows different styles for low credits vs zero credits |
| Pricing page as placeholder | Shows all 3 tiers with "Coming Soon" buttons; no payment integration yet (MVP scope) |
| Monthly reset utility (resetMonthlyCredits) | Batch function for cron job use (daily recommended); processes all users with expired creditsResetDate |
| Anniversary-based reset (30 days) | Fair billing for mid-month signups; each user's cycle is 30 days from signup, not calendar-aligned |
| MONTHLY_RESET action logged to CreditUsage | Audit trail includes previous/new credits, tier, and reset dates for compliance |
| shouldResetCredits helper function | Quick check for individual user reset status; useful for on-demand checks |
| **Standardized sentiment to balance model** | **Changed from usage model (sentimentUsed + sentimentQuota) to balance model (sentimentCredits) for consistency with response credits** |

### Schema Change: Sentiment Credits Standardization (January 20, 2026)

**What:** Changed sentiment credit tracking from usage model to balance model
**Why:** Consistency with response credits which already use balance model
**Risk Level:** Low ✅

**Before (Usage Model):**
```prisma
sentimentQuota      Int       @default(35)  // Maximum allowed
sentimentUsed       Int       @default(0)   // How many used
```

**After (Balance Model):**
```prisma
sentimentCredits    Int       @default(35)  // Remaining credits
```

**Benefits:**
1. **Consistency**: Both credit types follow the same pattern
2. **Simplicity**: One field instead of two
3. **Clarity**: "35 credits remaining" is clearer than "0 used of 35 quota"
4. **Efficiency**: Fewer fields to read/update in database operations

**API Response Format (Unchanged):**
```json
{
  "sentiment": {
    "remaining": 30,
    "total": 35,
    "used": 5,
    "resetDate": "2026-02-19T00:00:00.000Z"
  }
}
```
Total is now derived from tier limits instead of stored `sentimentQuota`.

**Files Modified:**
- `prisma/schema.prisma` - Schema change
- `src/lib/db-utils.ts` - Updated utility functions
- `src/lib/auth.ts` - OAuth user initialization
- `src/app/api/auth/signup/route.ts` - Email signup
- `src/app/api/credits/route.ts` - Credit balance API
- `src/app/api/dashboard/stats/route.ts` - Dashboard stats API
- `src/app/api/sentiment/usage/route.ts` - Sentiment usage API
- `src/app/api/reviews/route.ts` - Review creation with sentiment
- `src/types/database.ts` - Type definitions
- `scripts/test-db.ts` - Database test script

**Database Migration (SQL for Supabase):**
```sql
ALTER TABLE users ADD COLUMN "sentimentCredits" INTEGER DEFAULT 35;
UPDATE users SET "sentimentCredits" = "sentimentQuota" - "sentimentUsed";
-- After code deployment:
ALTER TABLE users DROP COLUMN "sentimentUsed";
ALTER TABLE users DROP COLUMN "sentimentQuota";
```

### 2. Deviations from Phase 0 Specifications

| Spec | Implementation | Why | Risk |
|------|----------------|-----|------|
| Spec mentioned running balance in usage table | Not implemented | Running balance requires complex calculation and adds UI complexity; users can see current balance in header | Low ✅ |
| Spec mentioned cron job setup | Created utility function only | Cron job infrastructure depends on deployment platform; function is ready for Vercel Cron or external service | Low ✅ |
| Spec mentioned Stripe integration | Placeholder pricing page | Payment integration is explicitly marked "Coming Soon" per MVP scope | None - intentional |

### 3. Key Implementation Details

**Credit APIs Created:**
- `GET /api/credits` - Returns full credit and sentiment quota status with tier info
- `GET /api/credits/usage` - Paginated usage history with filters (action, date range)

**Credit Balance Response Format:**
```typescript
{
  credits: { remaining, total, used, resetDate },
  sentiment: { remaining, total, used, resetDate },
  tier: "FREE" | "STARTER" | "GROWTH"
}
```

**Usage History Features:**
- Pagination: page, limit (default 20, max 100)
- Filters: action type, date range
- Includes: review preview (50 chars), platform, tone used
- CSV export with proper date formatting

**Low Credit Warning Thresholds:**
- Yellow warning: credits < 3
- Red alert: credits = 0
- Dismissible (session-based)
- CTA links to pricing page

**Reset Logic (anniversary-based, for future cron job):**
```typescript
async function resetMonthlyCredits(): Promise<{
  success: boolean;
  usersReset: number;
  errors: string[];
  details: Array<{userId, tier, creditsReset, sentimentReset}>;
}>
```
- Finds users where `creditsResetDate < now`
- Resets credits and sentimentCredits to tier defaults
- Sets next reset date to 30 days from current reset date (anniversary-based)
- Logs MONTHLY_RESET action to CreditUsage for audit
- Cron job should run daily to catch users whose reset date has passed

**Pricing Page:**
- 3 tiers: FREE ($0), STARTER ($29), GROWTH ($79)
- Feature comparison with checkmarks
- "Current Plan" badge for authenticated users
- "Coming Soon" disabled upgrade buttons
- FAQ section about credits, quotas, and reset timing

**Fraud Prevention (Already Implemented):**
- `deductCreditsAtomic()` uses Prisma transactions with row locking
- Credit check before AI generation (not after)
- HTTP 402 returned for insufficient credits
- All operations logged in CreditUsage table
- No credits deducted if AI generation fails

### 4. Single Source of Truth for Tier Limits (January 30, 2026)

**What:** Refactored pricing display to use `TIER_LIMITS` constants instead of hardcoded values
**Why:** Tier credit limits change frequently; hardcoded values in multiple places led to inconsistencies
**Risk Level:** Low ✅

**Problem:**
- `src/lib/constants.ts` had the canonical tier limits
- Landing page (`src/app/page.tsx`) had different hardcoded values
- Pricing page (`src/app/pricing/page.tsx`) had different hardcoded values in feature text
- Changing tier limits required updating 3+ files manually

**Solution:**
Both pages now import and use `TIER_LIMITS` from constants:
```typescript
import { TIER_LIMITS } from "@/lib/constants";

// Landing page
{TIER_LIMITS.STARTER.credits} responses/month
{TIER_LIMITS.STARTER.sentimentQuota} sentiment analyses

// Pricing page features
{ text: `${TIER_LIMITS.STARTER.credits} AI responses per month`, included: true }
```

**Files Modified:**
- `src/app/page.tsx` - Added import, replaced hardcoded values with TIER_LIMITS references
- `src/app/pricing/page.tsx` - Replaced hardcoded feature text with template literals using TIER_LIMITS

**Benefits:**
1. **Single source of truth**: All tier information comes from `src/lib/constants.ts`
2. **Easy updates**: Change values in one file, all pages automatically reflect the change
3. **Consistency**: No more mismatched values between pages
4. **Documentation**: `CORE_SPECS.md` and code constants stay in sync

**Current Tier Limits (as of January 30, 2026):**
| Tier | Credits | Sentiment | Price |
|------|---------|-----------|-------|
| FREE | 15 | 35 | $0 |
| STARTER | 30 | 150 | $29 |
| GROWTH | 100 | 500 | $79 |

---

### 5. UX Enhancement: OutOfCreditsDialog (January 30, 2026)

**What:** Replaced vanishing toast error with persistent modal dialog when user has insufficient credits
**Why:** Better UX - toast messages vanish quickly and don't provide actionable next steps
**Risk Level:** Low ✅

**Before:** `toast.error("Not enough credits. You have 0 credits remaining.")`

**After:** Modal dialog with:
- Clear title: "You're out of response credits"
- Context-aware message (generate vs regenerate)
- Credits status: "0 of 15" remaining
- Reset date: "Credits refresh on [date]"
- Primary CTA: "Upgrade Plan" → /pricing
- Secondary: "Close" button

**Component:** `OutOfCreditsDialog` in `src/components/dashboard/`

**Files Modified:**
- `src/components/dashboard/OutOfCreditsDialog.tsx` - New component
- `src/components/dashboard/index.ts` - Export added
- `src/components/providers/CreditsProvider.tsx` - Added creditsTotal, creditsResetDate to context
- `src/components/reviews/ResponsePanel.tsx` - Integrated dialog for generate/regenerate
- `src/app/(dashboard)/dashboard/reviews/[id]/page.tsx` - Integrated dialog
- `src/app/(dashboard)/dashboard/reviews/[id]/generate/page.tsx` - Integrated dialog

**Benefits:**
1. **Persistent feedback**: User can't miss the message
2. **Actionable CTA**: Direct path to upgrade
3. **Context**: Shows when credits reset for users who want to wait
4. **Consistent UX**: Same dialog across all generation points

---

### 6. Unified Credit Warning Banner (January 30, 2026)

**What:** Extended `LowCreditWarning` component to handle both response credits AND sentiment credits in a single unified banner
**Why:** Users need visibility into sentiment credit depletion; stacked banners create alert fatigue
**Risk Level:** Low ✅

**Problem:**
- Original `LowCreditWarning` only showed warnings for response credits
- No visibility when sentiment analysis credits were low or exhausted
- Potential for multiple stacked banners if implemented separately

**Solution:** Single unified banner with priority-based logic:

**Priority Matrix:**
| Response | Sentiment | Color | Title |
|----------|-----------|-------|-------|
| OK (≥3) | OK (≥3) | - | No banner |
| OK | Low (1-2) | Yellow | "Running Low on Sentiment Credits" |
| Low (1-2) | OK | Yellow | "Running Low on Response Credits" |
| OK | 0 | Yellow | "Out of Sentiment Credits" |
| Low (1-2) | Low (1-2) | Yellow | "Running Low on Credits" |
| 0 | OK | Red | "Out of Response Credits" |
| Low (1-2) | 0 | Red | "Out of Sentiment Credits" + response note |
| 0 | Low (1-2) | Red | "Out of Response Credits" + sentiment note |
| 0 | 0 | Red | "Out of Credits" |

**Color Logic:**
- **Red** = Response credits exhausted (0) - blocks core functionality
- **Yellow** = All other warning states

**Implementation:**
```typescript
type WarningType =
  | "none" | "response_low" | "response_out"
  | "sentiment_low" | "sentiment_out" | "both_low"
  | "response_out_sentiment_low" | "response_low_sentiment_out" | "both_out";

function getWarningState(responseCredits: number, sentimentCredits: number | undefined):
  { type: WarningType; isRed: boolean }
```

**Files Modified:**
- `src/components/dashboard/LowCreditWarning.tsx` - Extended props, added warning state logic
- `src/app/(dashboard)/dashboard/page.tsx` - Pass sentiment props to component

**Backward Compatibility:**
- Sentiment props are optional (`sentimentRemaining?`, `sentimentTotal?`, `sentimentResetDate?`)
- If not provided, component behaves exactly as before (response-only)

**Benefits:**
1. **Single unified banner**: No alert fatigue from stacked banners
2. **Priority-based display**: Response credits take precedence (blocks core functionality)
3. **Combined states**: Users see full picture when both credit types are low
4. **Earlier reset date**: When both types have issues, shows the earlier reset date

---

### 7. Sentiment Skipped Indicator (January 31, 2026)

**What:** Replaced vanishing toast with persistent inline alert + visual indicator when sentiment analysis is skipped
**Why:** Toast messages disappear quickly; users need clear visibility into why sentiment is missing
**Risk Level:** Low ✅

**Problem:**
- When adding a review with no sentiment credits, a toast message appeared briefly and vanished
- Users could easily miss this important information
- Reviews without sentiment showed nothing - no indication why sentiment was missing

**Solution:** Two-part improvement:

**Part 1: Inline Alert Banner on Review Detail Page**
- Pass `?sentimentSkipped=true` URL parameter when redirecting after adding review
- Show dismissible yellow alert banner: "Sentiment Analysis Skipped - No sentiment credits remaining"
- Includes "Upgrade for more credits" link to /pricing

**Part 2: "Sentiment ⚠" Indicator on Reviews**
- When sentiment is null, show "Sentiment" text + AlertCircle icon (muted gray)
- Tooltip on hover: "Sentiment analysis skipped - no credits"
- Appears on both ReviewCard (list) and review detail page

**Files Modified:**
- `src/components/reviews/ReviewForm.tsx` - URL param instead of toast
- `src/app/(dashboard)/dashboard/reviews/[id]/page.tsx` - Alert banner + sentiment indicator
- `src/components/reviews/ReviewCard.tsx` - Sentiment indicator with tooltip

**Visual:**
```
With sentiment:     ★★★★☆  Google  [positive]  Jan 15
Without sentiment:  ★★★★☆  Google  Sentiment ⚠  Jan 15
                                   └─ tooltip: "Sentiment analysis skipped - no credits"
```

**Benefits:**
1. **Persistent feedback**: Yellow alert banner stays until dismissed
2. **Actionable CTA**: Direct link to upgrade in alert banner
3. **Transparent state**: Users understand why sentiment is missing on specific reviews
4. **Consistent UX**: Same indicator pattern on cards and detail page

---

## Prompt 10: Testing & Deployment

*Decisions to be added after completing Prompt 10*

**Potential Decisions:**
- Deployment platform (Vercel per spec)
- Monitoring tools (Sentry recommended)
- Testing strategy priorities
- Beta user selection criteria

---

## Prompt 10: Testing & CI/CD Integration

### 1. Technical Decisions Made

| Decision | Reason |
|----------|--------|
| Vitest over Jest | Already configured in project; faster, native ESM, better Vite compatibility |
| Playwright over Cypress for E2E | Lighter, faster, better CI support, native `extraHTTPHeaders` for Vercel bypass |
| `vi.hoisted()` pattern for mocks | Required by Vitest's module hoisting; avoids `ReferenceError` when mocking `@/lib/prisma` |
| E2E against live staging URL (not local server) | Tests real deployment, catches Vercel-specific issues, no need to build/serve locally in CI |
| Vercel Protection Bypass header | Keeps staging protected from public while allowing CI to test |
| GitHub Issue creation on E2E failure | Reliable notification without external services; user gets email via normal issue notifications |
| Production deploy gates on E2E status | Prevents deploying broken code; checks latest `e2e-staging.yml` run conclusion |
| Integration tests skip without DB | Uses `describe.skipIf(!canRunIntegration)` to skip locally, run in CI with PostgreSQL container |
| Coverage excludes `src/components/ui/` | shadcn/ui components are third-party generated primitives; not worth testing |
| Shared test helpers in `tests/helpers/` | DRY mocking patterns: prisma-mock, auth-mock, fixtures, api-helpers, ai-mocks, email-mock |

### 2. Deviations from Phase 0 Specifications

| Spec | Implementation | Why | Risk |
|------|----------------|-----|------|
| Spec mentioned Sentry for monitoring | Not implemented | Testing focus for Prompt 10; Sentry is a separate deployment concern | Low ✅ |
| Spec mentioned 5 beta users | Not addressed | Operational task, not code | None |
| E2E described as "bonus phase" in CI-CD guide | Fully implemented | High value for catching deployment issues; natural fit after staging deploy | None |

### 3. Testing Architecture

**Test pyramid:**
```
     E2E (16 tests)           ← Playwright against staging
    ─────────────────
   Integration (11 tests)      ← Real PostgreSQL in CI
  ───────────────────────
 Unit Tests (447 tests)         ← Vitest with mocks
─────────────────────────────
```

**CI/CD test flow:**
```
PR → pr-checks.yml
├── lint + typecheck
├── unit tests (npm run test:unit)
└── integration tests (npm run test:integration) [PostgreSQL]

Merge to main → e2e-staging.yml
├── Wait for Vercel staging deploy (90s)
├── Verify staging reachable (with bypass header)
├── Run Playwright E2E (npm run test:e2e)
├── On failure: Create GitHub Issue with run link
└── Upload Playwright report artifact

Production deploy → deploy-production.yml
├─�� Validate confirmation ("deploy")
├── Check latest E2E staging passed ← NEW GATE
├── Re-run all tests (unit + integration)
└── Apply migrations + push to production branch
```

**Test file organization:**
```
tests/
├── helpers/          ← Shared mocks and fixtures (7 files)
├── unit/
│   ├── lib/          ← Pure logic + library tests (10 files)
│   ├── api/          ← API route handler tests (17 files)
��   └─��� components/   ← React component tests (3 files)
├── integration/      ← Real DB tests (2 files + helpers)
└── e2e/              ← Playwright specs (3 files)
```

**Required secrets for CI:**
| Secret | Used By | Purpose |
|--------|---------|---------|
| `STAGING_DATABASE_URL` | deploy-staging.yml | Prisma migrations |
| `STAGING_DIRECT_URL` | deploy-staging.yml | Prisma migrations |
| `PROD_DATABASE_URL` | deploy-production.yml | Prisma migrations |
| `PROD_DIRECT_URL` | deploy-production.yml | Prisma migrations |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | e2e-staging.yml | Bypass Vercel Deployment Protection |

---

## Deviations from Specifications

**Purpose:** Track any implementation that differs from Phase 0 documentation.

**Format:**
```markdown
### [Feature/Component Name]
- **Spec Location:** [Document name and line/section]
- **Spec Said:** [What the original spec specified]
- **Actually Implemented:** [What was built instead]
- **Reason for Deviation:** [Why we deviated]
- **Approved By:** [Your name/team]
- **Date:** [Date]
- **Impact:** [What changed due to this]
- **Risk Level:** [Low ✅ | Medium ⚠️ | High 🚨]
```

### Example Deviation (Placeholder)

*No deviations yet - will document here if/when they occur*

**When to document a deviation:**
- Implementation differs from Phase 0 specs
- Better approach discovered during development
- Technical constraint forced a change
- Spec was ambiguous and choice was made

**When NOT to document:**
- Minor code refactoring
- UI polish and styling tweaks
- Bug fixes
- Implementation details not specified in docs

---

## Architectural Patterns

### Patterns We're Following

#### Transaction Pattern for Credits
- **Pattern:** Always use Prisma transactions for credit deduction
- **Why:** Ensures atomicity, prevents race conditions
- **Example:** Check credits → Deduct → Log usage (all in transaction)
- **Source:** 02_PRD_MVP_PHASE1.md, fraud prevention section
- **Risk if not followed:** Incorrect credit tracking, security vulnerability

#### Audit Trail Pattern
- **Pattern:** Never delete CreditUsage or SentimentUsage records
- **Why:** Fraud prevention, GDPR compliance, accountability
- **Example:** Review deletion doesn't delete audit logs
- **Source:** 04_DATA_MODEL.md, 08_GDPR_COMPLIANCE.md
- **Risk if not followed:** Lost audit trail, GDPR violations

#### Soft Delete Pattern
- **Pattern:** Use deletedAt timestamp instead of hard deletes
- **Why:** Data recovery, audit trail, GDPR compliance
- **Example:** Review deletion sets deletedAt, doesn't remove row
- **Source:** 04_DATA_MODEL.md
- **Risk if not followed:** Irreversible data loss, GDPR issues

---

## Technology Choices

### Core Stack (From Specifications)
- **Frontend Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui (Radix UI primitives)
- **Database:** PostgreSQL via Supabase
- **ORM:** Prisma
- **Authentication:** NextAuth.js v5
- **AI (Responses):** Claude API (Anthropic)
- **AI (Sentiment):** DeepSeek API
- **Email:** Resend
- **Hosting:** Vercel

**All choices above are per specifications, not decisions.**

### Dependencies to Add During Development
*To be documented as they're installed*

---

## Performance Targets

### Response Times (From Specifications)
- **AI Response Generation:** <5 seconds (p95)
- **Page Load:** <2 seconds (p95)
- **API Latency:** <500ms (p95, non-AI endpoints)
- **Database Queries:** <100ms (p95)

**Source:** 02_PRD_MVP_PHASE1.md, Non-Functional Requirements

---

## Security Decisions

### Security Measures (From Specifications)
- **Password Hashing:** bcrypt cost factor 12
- **Sessions:** JWT, httpOnly cookies, 30-day expiry
- **Rate Limiting:** 5 login attempts per 15 min, 10 API calls/min for generation
- **CSRF Protection:** NextAuth.js handles automatically
- **SQL Injection:** Prisma ORM prevents automatically
- **XSS:** React escaping prevents automatically

**Source:** 06_SECURITY_PRIVACY.md

**Decisions during implementation:**
*To be added as security-related choices are made*

---

## Learning & Insights

### Key Learnings
*To be added as development progresses*

**Example format:**
```markdown
### [Topic/Area]
- **Learning:** [What was learned]
- **Context:** [When/where this came up]
- **Impact:** [How this changed our approach]
- **Date:** [Date]
```

---

## Review Audit Trail (Documented February 5, 2026)

### Problem Statement

When a review is deleted, the Credit History page shows `-` for Review Preview and Tone columns because:
1. The `CreditUsage.reviewId` foreign key becomes `null` (due to `onDelete: SetNull`)
2. The API reads from live `Review` and `ReviewResponse` records, which no longer exist
3. No fallback to stored snapshot data

For customer support scenarios, we need to trace "what happened to review X" even after deletion, while remaining GDPR compliant (no PII stored).

### Options Considered

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A. New `ReviewActivityLog` table** | Dedicated table tracking review lifecycle events (CREATED, RESPONSE_GENERATED, DELETED, etc.) | Clean separation, tracks all events, single query for activity | New table + migration, code changes everywhere, tracks events we may never need |
| **B. Enhance existing tables** | Store `reviewId` + metadata in `details` JSON field of `CreditUsage` and `SentimentUsage` | No schema change, minimal code changes, reuses existing infrastructure | Mixed concerns, can't track non-credit events (create, delete) |
| **C. Soft delete** | Add `deletedAt` column to `Review`, clear PII on delete but keep metadata | Clean data model, normal JOINs work | Schema migration, must update all queries with `WHERE deletedAt IS NULL` |

### Decision: Option B - Enhance Existing Tables

**Rationale:**
1. The primary problem (Credit History showing `-`) is solved by API fallback to `details` JSON
2. Full review lifecycle tracking (CREATED, DELETED events) is rarely needed - admin debug only
3. For rare audit scenarios, a JOIN query across `CreditUsage` + `SentimentUsage` can reconstruct the timeline
4. Soft delete is overkill - we're solving edge cases, not core functionality like enterprise/banking software
5. No schema migration required

### Implementation

**Tables affected:**
| Table | Has `reviewId`? | On Delete Behavior | What Survives |
|-------|----------------|-------------------|---------------|
| `CreditUsage` | Yes | `SetNull` (FK becomes null) | Record + `details` JSON |
| `SentimentUsage` | Yes | `SetNull` (FK becomes null) | Record + `details` JSON |

**`details` JSON structure for `CreditUsage`:**
```json
{
  "reviewId": "abc123",
  "platform": "google",
  "rating": 4,
  "tone": "friendly",
  "generatedAt": "2026-02-05T10:30:00Z"
}
```

**`details` JSON structure for `SentimentUsage`:**
```json
{
  "reviewId": "abc123",
  "platform": "google",
  "rating": 4,
  "analyzedAt": "2026-02-05T10:30:00Z"
}
```

**GDPR Compliance:**
- NO `textPreview` stored (review text may contain PII)
- NO `reviewerName` stored
- Only business metadata: `reviewId`, `platform`, `rating`, `tone`, timestamps
- `reviewId` is a system-generated identifier (cuid), not PII

**API Changes:**
- `/api/credits/usage`: Fallback to `details` JSON when `review` is null
- `/api/sentiment/usage`: Fallback to `details` JSON when `review` is null

**Credit History Display:**
| Review Status | Review Preview Column | Source |
|---------------|----------------------|--------|
| Exists | "Great service but the wait was..." | `Review.reviewText` (live JOIN) |
| Deleted | "Review #abc123 (deleted)" | `details.reviewId` (JSON fallback) |

### What This Does NOT Track

| Event | Tracked? | Why |
|-------|----------|-----|
| Review created | No | No credit consumed |
| Sentiment analyzed | Yes | `SentimentUsage` table |
| Response generated | Yes | `CreditUsage` table |
| Response regenerated | Yes | `CreditUsage` table |
| Response edited | No | No credit consumed |
| Review deleted | No | No credit consumed |

For the events not tracked, if full lifecycle tracking becomes necessary in the future, implement `ReviewActivityLog` table (see deferred section below).

### Future: `ReviewActivityLog` Table (If Needed)

If full lifecycle tracking becomes a requirement, create:

```prisma
model ReviewActivityLog {
  id        String   @id @default(cuid())
  reviewId  String   // NOT a FK - stored value survives deletion
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  action    String   // CREATED | RESPONSE_GENERATED | RESPONSE_REGENERATED | RESPONSE_EDITED | DELETED
  metadata  String?  @db.Text  // JSON: { platform, rating, tone, sentiment }

  createdAt DateTime @default(now())

  @@index([reviewId])
  @@index([userId, createdAt])
}
```

**Query for audit:**
```sql
SELECT action, metadata, createdAt
FROM ReviewActivityLog
WHERE reviewId = 'abc123'
ORDER BY createdAt;
```

---

## DB Health Check Strategy (Documented April 22, 2026)

### Problem Statement

Supabase's free tier auto-pauses databases after a period of inactivity. When the DB is paused:
- All queries fail until the project is manually unpaused
- The connection pooler (PgBouncer) can fall out of sync with the DB after unpause, requiring a password reset to fully recover
- First-time requests after a pause experience a cold start delay

Neither our E2E tests nor our unit tests hit the DB on a daily cadence, so both staging and production DBs are at risk of being paused if the app sits idle.

### Decision

Ping the DB daily from both environments via a lightweight `/api/health` endpoint that executes `SELECT 1` via Prisma.

- **Production** — triggered by a **Vercel cron** job (declared in `vercel.json`).
- **Staging** — triggered by a **GitHub Actions scheduled workflow** (`health-check-staging.yml`) that curls the staging URL.

### Why two different mechanisms?

Vercel crons only execute on the production domain — they don't run against Preview/staging deployments (platform limitation). So the staging environment needs a separate trigger. GitHub Actions scheduled workflows are free, reliable, and already part of our CI/CD, so we reuse that infrastructure.

### Implementation

| Environment | Trigger | Schedule (UTC) | Config file |
|-------------|---------|---------------|-------------|
| Production | Vercel cron → `/api/health` | Daily noon | `vercel.json` |
| Staging | GitHub Actions → curl staging `/api/health` | Daily 6 AM | `.github/workflows/health-check-staging.yml` |

**Endpoint:** `GET /api/health` — no auth required (not in `protectedApiRoutes` in `src/middleware.ts`), returns 200 + health payload on success, 503 on DB failure.

**Staging workflow auth:** Uses the existing `VERCEL_AUTOMATION_BYPASS_SECRET` to bypass Vercel Deployment Protection.

### Alternatives considered

| Option | Why rejected |
|--------|--------------|
| Upgrade Supabase to Pro | Easiest fix but unnecessary cost at current scale |
| External uptime service (UptimeRobot, Better Stack) | Yet another tool to manage; GitHub Actions is already available |
| Single cron hitting both environments | Doesn't work — Vercel crons are production-only |

### Related incident

On April 18, 2026, the staging DB got paused (E2E tests at the time didn't touch the DB). After Supabase auto-unpaused, the PgBouncer pooler failed to re-authenticate even with the correct password. The root cause fix was a password reset; this health-check strategy was introduced immediately after to prevent recurrence.

### Risk Level: Low ✅

The ping cost is negligible (one `SELECT 1` per day per environment). The endpoint is unauthenticated but intentionally discloses no sensitive data.

---

## MVP Phase 1: Pre-Launch Beta

This section documents the closed-beta layer added on top of the original MVP build. Source of truth: `docs/MVP_Phase-1/MVP.md`. Implementation tracked in `PROGRESS.md` under "MVP Phase 1 (Closed Beta)".

### Iteration 1 — Schema, Beta Plan, Invite-Code Signup, Admin Page

Branch: `feat/mvp-phase-1-iteration-1`. Five commits: docs amendments, schema, lib helpers, API layer, UI layer, plus tests + doc updates in the closing commit.

#### Decision 1: User-as-account (skip the standalone Account model)

- **Decision:** Treat `User` as the account-equivalent for MVP. `Location`, `BetaInviteLink.usedByUserId`, and `FounderInquiry.userId` all FK to `User`. The proper `Account` rollup is deferred to post-MVP multi-user / Scale-tier work.
- **Why:** MVP enforces 1 user per account at the application layer (MVP.md Section 4). Renaming the existing NextAuth `Account` to `OAuthAccount` and introducing a new top-level `Account` model would touch ~10+ call sites for zero MVP behavioral benefit.
- **Migration path when needed:** Standard expand-then-contract — add `Account` table + nullable `accountId` columns, backfill 1:1, dual-write, cutover, drop `userId`. Documented in MVP.md Section 8 amendment and the plan file's open-question section.
- **Risk:** Low ✅. Reversible.

#### Decision 2: Phase flag stored as a Vercel env var, not a DB row

- **Decision:** `CURRENT_PHASE=phase_1|phase_2` env var, read via `src/lib/system-phase.ts:getCurrentPhase()`. No `SystemConfig` table.
- **Why:** The phase flips once-ever at commercial launch. A DB row + cache + invalidation path is over-engineering for a one-time flip; a Vercel redeploy (~90s) is acceptable.
- **Trade-off:** Cannot flip the phase without redeploying. Acceptable because we never want to flip back-and-forth — the transition is monotonic.
- **Risk:** Low ✅.

#### Decision 3: OAuth invite-code propagation via short-lived HttpOnly cookie

- **Decision:** When the user lands on `/auth/signup?b=<code>` and clicks "Sign up with Google", a `POST /api/auth/stash-invite` sets `bx_invite_code` (HttpOnly, SameSite=Lax, 10-min Max-Age). NextAuth's `events.signIn` reads the cookie when `isNewUser === true` and applies the beta plan + marks the link used in a transaction. Best-effort cookie cleanup after.
- **Alternatives considered:** NextAuth's `state` parameter (more invasive — requires NextAuth-internal hacks); URL state through OAuth callback (Google strips most params).
- **Why cookie:** Smallest surface area. The invite code is non-sensitive (it's already in the URL the user clicked), and HttpOnly prevents JS-side reads.
- **Risk:** Low ✅. Failure mode is "user becomes Free instead of Beta" — visible, recoverable via founder grant.

#### Decision 4: No confirmation email back to founder-inquiry submitters

- **Decision:** When a user submits the founder-inquiry form (iteration 2), no auto-confirmation email is sent. The expired-link page already states the contract ("we'll send you a fresh invite within 24 hours"); the founder responds personally via email/WhatsApp per `BETA_ENGAGEMENT_PLAYBOOK.md`.
- **Why:** A confirmation email is dev work for zero validation signal. The founder is responding directly anyway.
- **Risk:** Low ✅.

#### Decision 5: Lo-fi admin gate via `FOUNDER_EMAILS` env var

- **Decision:** Comma-separated list of emails in `FOUNDER_EMAILS`. Middleware gates `/dashboard/admin/*` and `/api/admin/*`; each route handler also calls `isFounder(session)` server-side. Non-founders get a literal 404 (we don't disclose route existence). Initial value: `prajeen.builder@gmail.com`.
- **Alternative considered:** `User.isAdmin` boolean + admin-management UI. Rejected — proper RBAC adds DB column, UI for managing admins, audit trail. Wrong shape for one founder running a closed beta.
- **Trade-off:** Adding a new admin requires a Vercel env var change and redeploy. Acceptable at MVP scale.
- **Risk:** Low ✅.

#### Decision 6: `Review.locationId` nullable in iteration 1, non-null in iteration 3

- **Decision:** Two-phase migration for `Review.locationId`. Iteration 1: add as nullable + run `scripts/backfill-locations.ts`. Iteration 3: contract migration making it non-null after backfill is fully verified on prod.
- **Why:** Standard Postgres safe-rollout pattern. Allows the column to ship + the backfill to run + verification before the constraint locks it down. If anything goes wrong, a migration rollback doesn't lose data.
- **Risk:** Low ✅. Standard pattern; well-bounded.

#### Decision 7: Manual one-shot backfill via `tsx`, not Vercel deploy hook

- **Decision:** `scripts/backfill-locations.ts` is run manually (`npx tsx scripts/backfill-locations.ts --apply`) on staging-clone first, then prod. Idempotent — safe to retry.
- **Why:** A deploy-time hook auto-runs on every redeploy and is harder to roll back. Manual runs are explicit, observable, and reversible.
- **Risk:** Low ✅.

#### Decision 8: Beta plan is a flag (`isBetaUser`), not a tier

- **Decision:** `User.isBetaUser` boolean overrides tier-based credit allocation when true (150/750 instead of FREE's 15/35). `getEffectiveAllocation(user)` is the single source of truth.
- **Why:** A user is either on the Beta plan or on a regular tier, never both (MVP.md Section 4). At commercial launch, beta users transition to a real tier — keeping `isBetaUser` as a flag means we don't need a "BETA" enum value that has to be removed later.
- **Risk:** Low ✅.

#### GDPR `onDelete` semantics for new FKs

| FK | Behavior | Why |
|---|---|---|
| `Location.userId` | `Cascade` | Locations belong to user; nothing to preserve |
| `Review.locationId` (→ Location) | `Cascade` | Reviews belong to location |
| `BetaInviteLink.usedByUserId` | `SetNull` | Audit trail survives ("invite was used by deleted user") |
| `FounderInquiry.userId` | `SetNull` | Inquiry record survives user deletion |

#### Test coverage added in iteration 1

- 23 new unit tests across 4 files: admin beta-invites POST/GET, beta-invite validate (5 cases), stash-invite cookie set/clear, signup with betaCode (5 cases including phase_2 short-circuit), beta-reset path in db-utils
- Integration test file with 5 scenarios: atomic transaction, rollback on partial failure, rejection of expired invites, beta reset to 150/750 alongside FREE reset to 15/35, GDPR `SetNull` on user deletion
- E2E spec covering 5 public surfaces: signup with no code, signup with unknown code (redirect), beta-link-expired page render, admin route 404 for unauthenticated users, admin API 404
- Total: **604 unit tests passing** (up from 581) + **5 new integration tests** + **5 new E2E tests**

### Iteration 2 — Onboarding Wizard, Founder-Inquiry Form, Phase-Aware Dialogs, Closed-Beta Banner

Branch: `feat/mvp-phase-1-iteration-2`. Four commits: API layer, shared UI, pages, tests + docs. No schema changes — `Location`, `BetaInviteLink`, `FounderInquiry` already shipped in iteration 1.

#### Decision 9: Single-page onboarding form, not multi-step wizard

- **Decision:** `/onboarding` is a single page with three visual sections (About your business / Your first location / Tell us more). Multi-step wizard rejected.
- **Why:** The required-field count is small (4 mandatory + 3 optional + 2 conditional for non-beta users). Wizards add friction (back/next navigation, partial-state management, "can I abandon and resume?") and the existing codebase has no multi-step form pattern to extend. A single page with visually grouped sections gives the "structured intake" feel without the navigation overhead.
- **Risk:** Low ✅. If we add many more profile fields post-MVP, we can split into steps then.

#### Decision 10: Industries and countries are closed enum-as-string sets with "Other" escape hatch

- **Decision:** `INDUSTRIES` and `COUNTRIES` constants in `src/lib/constants.ts`. Industries: 6 specific + Other. Countries: 9 specific + Other.
- **Why:** Beta will start in a few markets (UK, Ireland, US primarily). Closed-set validation keeps the data clean for segmentation analysis. Free-text "industry" leads to "Cafe", "cafe", "coffee shop", "café" all being different values. "Other" acts as a soft escape hatch so users with industries we don't yet recognise can still sign up; their inquiries will be visible in the admin view if they ask.
- **Trade-off:** Future expansion requires constant + (optional) Zod schema update. Acceptable — it's a 5-line change.
- **Risk:** Low ✅.

#### Decision 11: Location name is a label, not a postal address

- **Decision:** `Location.name` is a short human-recognizable label. Placeholder text reads `e.g. "The Bear Bakery — Shoreditch"`. Helper text explicitly says "Not a postal address."
- **Why:** No mapping, geocoding, or postal logic is integrated. The label's only purpose is to help users identify a location in their dashboard. When multi-location ships post-MVP, we'd likely add a separate `address` field for real addresses — `name` stays a label, no migration of existing data needed.
- **Risk:** Low ✅.

#### Decision 12: `currentPhase` flows through CreditsProvider; `process.env.CURRENT_PHASE` never reaches the client bundle

- **Decision:** Server components (`(dashboard)/layout.tsx`, `pricing/page.tsx`) call `getCurrentPhase()` and pass the result as a prop to client wrappers. Client wrappers pass it to `CreditsProvider` via `initialCurrentPhase`. Phase-aware client components (`OutOfCreditsDialog`, `LowCreditWarning`, `PricingClient`) read it via `useCredits()`.
- **Why:** `CURRENT_PHASE` is a server-only env var. Reading `process.env.CURRENT_PHASE` in a client component returns `undefined` in the browser bundle (same gotcha that bit us with `FOUNDER_EMAILS` → PR #72 Sidebar fix). The server-component wrapper pattern keeps the env-var read on the server and threads the value through React props.
- **Alternative considered:** Add a `NEXT_PUBLIC_CURRENT_PHASE` env var so the client can read it directly. Rejected — `NEXT_PUBLIC_*` bakes the value into the build bundle at build time, so flipping the env var on Vercel would require a redeploy for the client to pick up the change. Same redeploy cost as the existing pattern, but with less obvious data flow.
- **Risk:** Low ✅.

#### Decision 13: `OutOfCreditsDialog` swaps content in-place instead of opening a nested dialog

- **Decision:** When `phase_1` and the user clicks "Request more credits" / "Request beta access" in `OutOfCreditsDialog`, the dialog's content swaps from the "out of credits" summary to the `FounderInquiryForm` via internal `view` state. A "← Back" button returns to the summary.
- **Why:** Stacking two dialogs on mobile is awkward and easy to dismiss accidentally. Swapping content keeps a single dismissible surface and avoids z-index management.
- **Alternative:** Open a separate dialog from the same trigger. Rejected per above. (Note: `LowCreditWarning` *does* open a nested dialog because the alert itself isn't a dialog — there's no swap-content option.)
- **Risk:** Low ✅.

#### Decision 14: `FounderInquiryForm` is one shared component used in four places, parameterised by `type` + `source`

- **Decision:** Single component at `src/components/shared/FounderInquiryForm.tsx`. Caller passes `type` (one of `beta_request | more_credits | general | expired_link_recovery`) and `source` (one of `expired_link | pricing | zero_balance | onboarding_intent | other`). The form's copy adapts by type (heading, description, message placeholder, submit button label) with sane defaults baked in, overridable per callsite.
- **Why:** MVP.md Section 13.4 explicitly calls for unification. Four variants of the same form would be 4× the maintenance with no benefit. The `type` and `source` enums let the founder filter inquiries by origin in the admin view and correlate with PostHog events (iteration 3).
- **Risk:** Low ✅.

#### Decision 15: No auto-confirmation email back to inquirers; `replyTo` set so founder can hit Reply

- **Decision:** Confirmed iteration 1 amendment in MVP.md Section 13.4. The founder-inquiry notification email goes to the founder only (`FOUNDER_PUBLIC_EMAIL`). The submitter receives no auto-confirmation. `replyTo` is set to the submitter's email so the founder's reply lands directly in the submitter's inbox without manual address copy-paste.
- **Why:** The expired-link page already states the contract ("we'll send a fresh invite within 24 hours"). Confirmation emails add dev work for zero validation signal. The founder responds personally per the engagement playbook.
- **Risk:** Low ✅.

#### Decision 16: `POST /api/founder-inquiries` is public + rate-limited; refuses inquiries with no reachable email

- **Decision:** The route accepts both authenticated and unauthenticated submissions. Rate-limited per-IP via the existing `apiRateLimit` (60 req/min). Returns 400 if neither the form nor the session provides a `submitterEmail` — an inquiry with no email is unactionable.
- **Why:** The expired-link recovery flow happens before signup (no session). Other call sites have a session and can backfill from `session.user`. The form code follows this contract: it shows submitter fields when there's no pre-fill, hides them when fully pre-filled (signed-in CTAs).
- **Trade-off:** A 400 leaks "this is the submission endpoint" to spam crawlers. Acceptable for MVP — the form is on public pages anyway. If spam becomes an issue we'd add CAPTCHA, not change the validation logic.
- **Risk:** Low ✅.

#### Decision 17: Onboarding submission is transactional; FounderInquiry rolls back with the user update

- **Decision:** `PATCH /api/user/profile` wraps user-row update + Location upsert + (optional) FounderInquiry create in a single Prisma `$transaction`. Notification email fires after the response via `waitUntil`.
- **Why:** Same pattern as iteration 1's signup-with-betaCode flow. A partial write would leave the user in a "I filled the form but my dashboard doesn't show my profile" half-state. Better to fail loudly and let them retry than have weird leftover state.
- **Risk:** Low ✅.

#### Decision 18: Admin route shape stays consistent — 404 for non-founders, no route disclosure

- **Decision:** `/api/admin/founder-inquiries` and `/dashboard/admin/founder-inquiries` use the same lo-fi gate as iteration 1's beta-invites admin: middleware checks `isFounderEmail(token.email)`, route handler also calls `isFounder(session)` server-side as defense-in-depth, response is 404 (not 403) for non-founders.
- **Why:** Consistency. Same pattern as `/api/admin/beta-invites`. Proper RBAC is still post-MVP work.
- **Risk:** Low ✅.

#### Test coverage added in iteration 2

- 41 new unit tests across 4 files:
  - `tests/unit/api/founder-inquiries/founder-inquiries.test.ts` — 8 cases (POST: unauthenticated + auth-backfilled submissions, rejection of no-email submissions, malformed JSON, schema validation, rate-limit, fire-and-forget email failure)
  - `tests/unit/api/admin/founder-inquiries.test.ts` — 14 cases (GET: 404 gating, paginated list, type filter, resolved-true filter, resolved-false filter, invalid pagination 400, unknown-type silently ignored; PATCH: 404 for non-founder, 404 for missing inquiry, mark resolved with notes, re-open, notes-only update, clear notes with null)
  - `tests/unit/api/user/profile.test.ts` — 11 cases (PATCH: 401 unauthenticated, 400 missing required field, 400 invalid industry, 404 user gone, location-create vs. location-rename, beta_request inquiry for non-beta + intent=yes, inquiry for non-empty challenge text, no inquiry for beta users, no inquiry for intent=just_trying without text, malformed JSON 400)
  - `tests/unit/lib/email.test.ts` — 8 new cases for `sendFounderInquiryNotification` (founder public email destination, subject labelling per type, replyTo wiring, replyTo omission when submitter email missing, body content (inquiryId, business, message), HTML escape of user-supplied text, Resend success/error result shapes)
- New integration test file `tests/integration/onboarding-flow.test.ts` — 5 scenarios: atomic transaction with intent=yes fires inquiry, beta user doesn't fire redundant inquiry, existing Default Location renamed not duplicated, full rollback on transaction failure, GDPR `SetNull` on user deletion preserves inquiry audit
- New E2E spec `tests/e2e/iteration-2-surfaces.spec.ts` — 7 cases: pricing banner under phase_1, tier cards swap CTAs, banner CTA opens dialog, admin page 404 for unauth, admin API 404 for unauth, public POST accepts valid submission, public POST rejects no-email submission. Updated existing `beta-link-expired` E2E to assert embedded form fields instead of mailto link.
- Total: **652 unit tests passing** (up from 611) + **5 new integration scenarios** (10 total with iteration 1's) + **7 new E2E tests** (covered alongside the existing E2E suite)

---

## Decision Log

### Quick Reference Table

| # | Decision | Prompt | Date | Risk | Status |
|---|----------|--------|------|------|--------|
| 1 | Credit-based pricing | Phase 0 | Jan 5 | Low ✅ | ✅ Spec |
| 2 | DeepSeek for sentiment | Phase 0 | Jan 5 | Low ✅ | ✅ Spec |
| 3 | Three tiers (no Enterprise) | Phase 0 | Jan 5 | Low ✅ | ✅ Spec |
| 4 | Manual input first | Phase 0 | Jan 5 | Low ✅ | ✅ Spec |
| 5 | Sentiment balance model | Post-Prompt 9 | Jan 20 | Low ✅ | ✅ Implemented |
| 6 | No sentiment backfill on reset | Prompt 8 | Feb 4 | Low ✅ | ✅ By design |
| 7 | Cron job for credit reset | Post-Prompt 9 | Feb 4 | Low ✅ | ✅ Implemented |
| 8 | Tabbed Credit History page | Post-Prompt 9 | Feb 4 | Low ✅ | ✅ Implemented |
| 9 | Review audit via details JSON | Post-Prompt 9 | Feb 5 | Low ✅ | ✅ Implemented |
| 10 | Vitest for unit/integration tests | Prompt 10 | Mar 27 | Low ✅ | ✅ Implemented |
| 11 | Playwright for E2E tests | Prompt 10 | Mar 27 | Low ✅ | ✅ Implemented |
| 12 | E2E runs post-staging deploy, gates production | Prompt 10 | Mar 27 | Low ✅ | ✅ Implemented |
| 13 | GitHub Issue on E2E failure (notification) | Prompt 10 | Mar 27 | Low ✅ | ✅ Implemented |
| 14 | Real E2E core-flow test gating production deploy | Post-Prompt 10 | Apr 17 | Low ✅ | ✅ Implemented |
| 15 | Mock AI in E2E via `E2E_MOCK_AI` env var on Vercel Preview | Post-Prompt 10 | Apr 17 | Low ✅ | ✅ Implemented |
| 16 | DB health check ping (Vercel cron for prod, GitHub Action for staging) | Post-Prompt 10 | Apr 17 | Low ✅ | ✅ Implemented |
| 17 | Add `trustHost: true` to NextAuth config | Post-Prompt 10 | Apr 22 | Low ✅ | ✅ Implemented |
| 18 | User-as-account (skip standalone Account model in MVP) | MVP Phase 1 / It. 1 | May 9 | Low ✅ | ✅ Implemented |
| 19 | `CURRENT_PHASE` env var instead of `SystemConfig` DB row | MVP Phase 1 / It. 1 | May 9 | Low ✅ | ✅ Implemented |
| 20 | OAuth invite-code via short-lived HttpOnly cookie | MVP Phase 1 / It. 1 | May 9 | Low ✅ | ✅ Implemented |
| 21 | No auto-confirmation email to inquiry submitters | MVP Phase 1 / It. 1 | May 9 | Low ✅ | ✅ Implemented |
| 22 | `FOUNDER_EMAILS` env-var admin gate (no User.isAdmin) | MVP Phase 1 / It. 1 | May 9 | Low ✅ | ✅ Implemented |
| 23 | `Review.locationId` two-phase migration (nullable → backfill → non-null) | MVP Phase 1 / It. 1 | May 9 | Low ✅ | ✅ Iter. 1 done; iter. 3 pending |
| 24 | Manual one-shot backfill via tsx (not Vercel hook) | MVP Phase 1 / It. 1 | May 9 | Low ✅ | ✅ Implemented |
| 25 | Beta plan is `isBetaUser` flag, not a Tier enum value | MVP Phase 1 / It. 1 | May 9 | Low ✅ | ✅ Implemented |
| 26 | Single-page onboarding form (visually grouped sections), not multi-step wizard | MVP Phase 1 / It. 2 | May 11 | Low ✅ | ✅ Implemented |
| 27 | Industries and countries are closed enum-as-string sets with "Other" escape hatch | MVP Phase 1 / It. 2 | May 11 | Low ✅ | ✅ Implemented |
| 28 | `Location.name` is a human-readable label, not a postal address | MVP Phase 1 / It. 2 | May 11 | Low ✅ | ✅ Implemented |
| 29 | `currentPhase` threads via server-component wrapper → CreditsProvider (never reaches client bundle as env var) | MVP Phase 1 / It. 2 | May 11 | Low ✅ | ✅ Implemented |
| 30 | `OutOfCreditsDialog` swaps content in-place rather than nesting another dialog | MVP Phase 1 / It. 2 | May 11 | Low ✅ | ✅ Implemented |
| 31 | `FounderInquiryForm` is one shared component, parameterised by `type` + `source` | MVP Phase 1 / It. 2 | May 11 | Low ✅ | ✅ Implemented |
| 32 | No auto-confirmation email to inquirer; founder notification uses `replyTo` | MVP Phase 1 / It. 2 | May 11 | Low ✅ | ✅ Implemented |
| 33 | `POST /api/founder-inquiries` is public + rate-limited; refuses no-email submissions | MVP Phase 1 / It. 2 | May 11 | Low ✅ | ✅ Implemented |
| 34 | Onboarding submission transactional; notification email via `waitUntil` | MVP Phase 1 / It. 2 | May 11 | Low ✅ | ✅ Implemented |

*Table will grow as decisions are made*

---

## Change Log

**May 11, 2026** — MVP Phase 1 (Closed Beta), Iteration 2
- New constants in `src/lib/constants.ts`: `INDUSTRIES` (6 + Other), `COUNTRIES` (9 + Other), `SIGNUP_INTENTS`, `FOUNDER_INQUIRY_TYPES`, `FOUNDER_INQUIRY_SOURCES`. Extended `VALIDATION_LIMITS` with organisation/location/message/notes bounds.
- New Zod schemas in `src/lib/validations.ts`: `onboardingSubmitSchema` (required: org name, industry, country, location name), `createFounderInquirySchema`, `resolveFounderInquirySchema`. Extended `updateProfileSchema` with the new iteration-2 fields (all optional for partial updates).
- New email helper `sendFounderInquiryNotification` in `src/lib/email.ts` — Resend send to `FOUNDER_PUBLIC_EMAIL` with `replyTo` = submitter email and HTML-escaped message body.
- New API routes: `POST /api/founder-inquiries` (public, rate-limited), `GET /api/admin/founder-inquiries` (founder-only, paginated, filterable by type/resolved), `PATCH /api/admin/founder-inquiries/[id]` (founder-only, toggle resolved + notes), `PATCH /api/user/profile` (auth, transactional onboarding submission).
- Modified existing routes: `GET /api/dashboard/stats` and `GET /api/credits` now return `isBetaUser` in the response (the field was already selected from Prisma — just not emitted).
- New shared component `src/components/shared/FounderInquiryForm.tsx` — used in 4 places (expired-link page, pricing banner CTA, OutOfCreditsDialog, LowCreditWarning), parameterised by type + source, copy adapts per type.
- Phase-aware updates to `OutOfCreditsDialog` (in-place content swap to inquiry form under phase_1) and `LowCreditWarning` (nested dialog with inquiry form under phase_1). Both backward-compatible: new props default to phase_2 behavior.
- `CreditsProvider` tracks `isBetaUser` (mutable, refreshed from API) and `currentPhase` (fixed at mount from `initialCurrentPhase` prop, sourced from the `CURRENT_PHASE` env var via the server-component wrapper).
- New UI pages: `/dashboard/admin/founder-inquiries` (founder-only admin table with type/status filters + mark-resolved dialog); real `/onboarding` wizard replacing iteration 1's placeholder; real `FounderInquiryForm` embedded in `/auth/beta-link-expired` replacing the mailto fallback.
- `/pricing` refactored into server entry + client component to allow reading `CURRENT_PHASE` at the server. Phase_1 renders the closed-beta banner ("BrandsIQ is currently in closed beta — Request beta access →") and swaps per-tier "Coming Soon" buttons for "Request beta access" buttons. Phase_2 keeps existing behaviour.
- `(dashboard)/layout.tsx` split into server entry + `layout-client.tsx` to thread `currentPhase` through `CreditsProvider`. All existing pages that consume `OutOfCreditsDialog` (review detail, review generate, ResponsePanel) and `LowCreditWarning` (dashboard) now pass `currentPhase` + `isBetaUser` props.
- `Sidebar` adds "Founder inquiries" admin nav item (Inbox icon) alongside the existing "Beta invites".
- 41 new unit tests, 5 new integration scenarios, 7 new E2E specs. Total suite: 652 unit tests passing (up from 611).
- All decisions in this iteration are Low ✅ risk; no schema changes; iteration is independently shippable to staging.

**May 9, 2026** — MVP Phase 1 (Closed Beta), Iteration 1
- Added `docs/MVP_Phase-1/MVP.md` to git with 4 implementation amendments (Sections 2, 8, 13.2, 13.4)
- New schema: `Location`, `BetaInviteLink`, `FounderInquiry` models; `User.isBetaUser` + 7 profile fields; `Review.locationId` (nullable in this iteration)
- New constants: `BETA_PLAN` (150/750), `BETA_INVITE_EXPIRY_DAYS` (60), `getEffectiveAllocation` helper
- `db-utils.ts:resetMonthlyCredits` now honors `isBetaUser` via `getEffectiveAllocation`
- New helpers: `src/lib/auth-helpers.ts` (`isFounder`, `isFounderEmail`), `src/lib/system-phase.ts` (`getCurrentPhase`)
- New API routes: `POST/GET /api/admin/beta-invites`, `GET /api/beta-invites/[code]/validate`, `POST/DELETE /api/auth/stash-invite`
- Modified API routes: `POST /api/auth/signup` accepts `betaCode` with atomic transaction; `lib/auth.ts events.signIn` reads invite cookie for OAuth path
- New UI: `/auth/beta-link-expired` (placeholder mailto recovery; full form lands in iteration 2), `/dashboard/admin/beta-invites` (founder-only), `/onboarding` (placeholder)
- Modified UI: `SignupForm` reads `?b=<code>` and shows banner; `Sidebar` conditionally shows admin section; `middleware.ts` gates admin routes (404 for non-founders)
- New env vars: `FOUNDER_EMAILS=prajeen.builder@gmail.com`, `CURRENT_PHASE=phase_1` (defaults to phase_1 if unset)
- `scripts/backfill-locations.ts` (one-shot tsx, idempotent, dry-run by default)
- 23 new unit tests, 5 new integration tests, 5 new E2E specs. Total suite: 604 unit / 11 skipped (integration require localhost DB)
- All decisions in this iteration are Low ✅ risk; the iteration is independently shippable to staging

**April 22, 2026**
- Fixed incomplete rebranding: replaced 6 remaining `review-flow-*` URLs with `brandsiq-*` in `playwright.config.ts` and both staging workflows (PR #52)
- Added `trustHost: true` to NextAuth config in `src/lib/auth.ts` — required for auth to work across Vercel domain aliases without explicit per-host configuration (PR #52)
- Fixed Playwright strict-mode locator violations in `tests/e2e/core-flow.spec.ts` by switching to `getByRole` / `getByText({ exact: true })` (PR #54)
- First successful end-to-end production deploy using the new E2E gate: staging E2E passes → production deploy cleared

**April 17, 2026** (extended test coverage + health check strategy)
- Expanded unit test suite from 447 → 581 tests (PR #38): 13 new component test files + sentiment usage API test
- Added `GET /api/health` endpoint with Prisma `SELECT 1` ping (PR #39)
- Added Vercel cron for production DB health check (daily noon UTC via `vercel.json`)
- Added GitHub Actions scheduled workflow for staging DB health check (`health-check-staging.yml`, daily 6 AM UTC) — needed because Vercel crons only run on production domain
- Added real E2E core-flow test (`tests/e2e/core-flow.spec.ts`): login → add review → generate response → edit → approve
- Added `E2E_MOCK_AI` env var support in `src/lib/ai/claude.ts` — when set to `"true"` on Vercel Preview, Claude API calls return a canned response (zero AI cost per merge). Production never has this var set.
- Added `workflow_dispatch` trigger to `e2e-staging.yml` for manual re-runs (PR #42)

**March 27, 2026**
- Implemented comprehensive test suite (Prompt 10 - Testing):
  - 447 unit tests across 30 files (Vitest + Testing Library)
  - 11 integration tests with PostgreSQL (2 files)
  - 16 E2E tests with Playwright (3 files: landing, auth, pricing)
  - 7 shared test helper files (fixtures, prisma-mock, auth-mock, api-helpers, ai-mocks, email-mock, integration helpers)
  - Updated `vitest.config.ts` with coverage exclusions
  - Updated `tests/setup.ts` with default env vars for CI
- Added Playwright E2E infrastructure:
  - `playwright.config.ts` with Vercel bypass header support
  - `test:e2e` and `test:e2e:headed` scripts in `package.json`
  - `.gitignore` updated for Playwright artifacts
- Created `e2e-staging.yml` workflow:
  - Triggers on push to main (after staging deploy)
  - Waits 90s for Vercel deploy, verifies staging reachable
  - Runs Playwright against live staging URL with `x-vercel-protection-bypass` header
  - Creates GitHub Issue automatically on failure with run link and reproduction steps
  - Uploads Playwright report as artifact (7-day retention)
- Updated `deploy-production.yml`:
  - Added `check-e2e` job that verifies latest E2E staging run passed
  - Production deploy now depends on: validate → check-e2e → test → deploy
  - Blocks production deployment if E2E failed on staging
- PR: prajeenv/BrandsIQ#6

**February 5, 2026**
- Implemented Review Audit Trail:
  - Problem: Credit History shows `-` for deleted reviews (no traceability)
  - Decision: Enhance `CreditUsage` and `SentimentUsage` with `details` JSON containing `reviewId` and metadata
  - Rejected alternatives: New `ReviewActivityLog` table (overkill), Soft delete (unnecessary complexity)
  - GDPR compliant: Removed `textPreview`/`preview` (PII), only business metadata stored
  - Files modified:
    - `src/app/api/reviews/[id]/generate/route.ts` - Updated details JSON structure
    - `src/app/api/reviews/[id]/regenerate/route.ts` - Updated details JSON structure
    - `src/app/api/reviews/route.ts` - Updated sentiment details JSON structure
    - `src/app/api/credits/usage/route.ts` - Added fallback to details JSON when review deleted
    - `src/app/api/sentiment/usage/route.ts` - Added fallback to details JSON when review deleted
  - Added `isDeleted` flag to API responses for UI to show "(Review deleted)" indicator

**February 4, 2026**
- Added cron job endpoint for monthly credit reset (`/api/cron/reset-credits`)
- Added `vercel.json` with daily cron schedule (midnight UTC)
- Documented CRON_SECRET in `.env.example`
- Refactored db-utils.ts to use TIER_LIMITS from constants.ts (single source of truth)
- Documented decision: No sentiment backfill on credit reset (deferred to Phase 2 with batch analysis)
- Refactored Credit History page with tabbed interface:
  - Renamed "Credit Usage History" → "Credit History"
  - Added tabs: "Response Credits" and "Sentiment Credits"
  - Created `src/components/ui/tabs.tsx` (shadcn/ui component)
  - Updated `/api/sentiment/usage` with pagination and filters
  - Sentiment tab shows: Date, Sentiment (badge), Credits (-1), Platform, Review Preview
  - Each tab has independent filters, pagination, and CSV export

**January 31, 2026**
- Added "Sentiment ⚠" indicator with tooltip for reviews without sentiment analysis
- Replaced sentiment skipped toast with inline alert banner on review detail page
- URL parameter `?sentimentSkipped=true` for persistent feedback after adding review

**January 30, 2026**
- Added OutOfCreditsDialog for better UX when user has no credits
- Standardized reset date language across components ("Resets on" instead of "Credits refresh on")
- Extracted `getNextResetDate()` utility function to shared `src/lib/utils.ts`
- Refactored pricing pages to use `TIER_LIMITS` constants (single source of truth)
- Updated tier limits: STARTER 60→30 credits, GROWTH 200→100 credits
- Extended LowCreditWarning to unified banner handling both response and sentiment credits

**January 19, 2026 (Prompt 9)**
- Implemented credit system management features:
  - GET /api/credits endpoint for credit balance
  - GET /api/credits/usage endpoint with pagination and filters
  - Credit Usage History page at /dashboard/settings/usage
  - LowCreditWarning component on dashboard (shows when credits < 3)
  - Pricing page placeholder at /pricing
  - Monthly reset utility function (resetMonthlyCredits)
- Updated settings page to include Credit Usage History and Pricing links

**January 20, 2026**
- Standardized sentiment credits to balance model (major schema change)
  - Changed from `sentimentUsed` + `sentimentQuota` to single `sentimentCredits` field
  - Matches how response credits work (balance model)
  - Modified 10 files across schema, APIs, auth, and types
  - SQL migration required for production database
  - See "Schema Change: Sentiment Credits Standardization" section above for details

- Changed credit reset from calendar-based (first of month) to anniversary-based (30 days from signup)
  - Fairer billing for mid-month signups
  - New users get creditsResetDate set to 30 days from signup
  - `getNextResetDate()` now calculates 30 days from current reset date per user
  - Updated auth.ts, signup/route.ts, and db-utils.ts
  - Updated pricing page FAQ to explain anniversary billing

**January 19, 2026**
- Standardized date formatting across all pages (dashboard, review list, review details, responses, version history)
  - Relative time for dates within 2 days: "just now", "5m ago", "3h ago", "1d ago"
  - Absolute date for dates beyond 2 days: "Jan 16, 2026" format
  - Review date (when customer wrote review) takes priority over created date (when added to system)
  - Labels: "Reviewed X ago" for review date, "Added X ago" for created date fallback
  - Added reviewer name display in review list (right side, next to timestamp)

**January 18, 2026**
- Removed "Delete Response" feature (redundant - users can regenerate instead)
  - Removed DELETE /api/reviews/[id]/response endpoint
  - Removed Delete button and confirmation dialog from ResponsePanel
  - Note: Deleting a Review still cascades to delete its response (unchanged)

**January 7, 2026**
- Created DECISIONS.md template
- Documented Phase 0 decisions
- Set up structure for Phase 1 decisions

---

**Note:** This document should be updated after each prompt execution. When in doubt about whether something is a "decision," document it - better to over-document than under-document.

**Last Reviewed:** May 9, 2026 (MVP Phase 1 closed-beta, iteration 1: schema + lib + APIs + UI + tests)

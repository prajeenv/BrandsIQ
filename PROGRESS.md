# BrandsIQ Development Progress

**Project:** BrandsIQ - AI-Powered Review Response Management Platform  
**Started:** January 7, 2026  
**Developer:** Prajeen  
**Current Phase:** MVP Phase 1 (Closed Beta) — see `docs/MVP_Phase-1/MVP.md`

> **Note on "Phase 1":** This document uses the phrase "Phase 1" in two senses.
> - **"Phase 1: Core MVP"** below refers to the original 10-prompt Core MVP build (Jan–Mar 2026, completed). It produced the FREE/STARTER/GROWTH tier app.
> - **"MVP Phase 1 (Closed Beta)"** later in the document refers to the closed-beta layer added on top, per `docs/MVP_Phase-1/MVP.md` (May 2026, in progress). Its companion is "MVP Phase 2 (Commercial Launch)" — Stripe and payment flows.

---

## Quick Status

| Phase | Status | Start Date | End Date | Duration |
|-------|--------|------------|----------|----------|
| Phase 0: Documentation | ✅ Complete | Jan 1, 2026 | Jan 6, 2026 | 6 days |
| Phase 1: Core MVP | ✅ Complete | Jan 7, 2026 | Mar 27, 2026 | ~12 weeks |
| MVP Phase 1 (Closed Beta) | ✅ Complete (iter. 1, 2 & 3 done) | May 9, 2026 | May 19, 2026 | ~11 days |
| Brand Voice Page Redesign | 🚧 In progress (iter. 1 done) | May 20, 2026 | - | - |
| MVP Phase 2 (Commercial Launch) | ⏳ Not Started | - | - | - |
| Phase 2: CSV Import | ⏳ Not Started | - | - | - |
| Phase 3: Integrations | ⏳ Not Started | - | - | - |

**Overall Progress:** Original Core MVP complete; closed-beta layer complete (all 3 iterations shipped to production); brand voice redesign iteration 1 complete on branch.

---

## Phase 0: Documentation ✅

**Status:** Complete  
**Duration:** 6 days (Jan 1-6, 2026)

### Documents Created:
- ✅ 01_PRODUCT_ONE_PAGER.md
- ✅ 02_PRD_MVP_PHASE1.md
- ✅ 03_USER_FLOWS.md
- ✅ 04_DATA_MODEL.md
- ✅ 05_API_CONTRACTS.md
- ✅ 06_SECURITY_PRIVACY.md
- ✅ 07_AUTHENTICATION_SYSTEM.md
- ✅ 08_GDPR_COMPLIANCE.md
- ✅ 09_MULTILANGUAGE_SUPPORT.md
- ✅ 10_CLAUDE_CODE_PROMPTS.md
- ✅ DOCUMENTATION_ROADMAP.md
- ✅ IMPLEMENTATION.md
- ✅ README.md

**Outcome:** Complete technical specifications ready for implementation

---

## Phase 1: Core MVP (Week 1-2)

**Target Timeline:** 14 days (Jan 7-20, 2026)  
**Current Day:** Day 1

---

### ⏳ Prompt 0: Planning & Architecture Review

**Status:** Completed
**Planned Start:** Jan 8, 2026  
**Estimated Duration:** 0.5 day

**Objectives:**
- [ ] Validate tech stack with Claude Code
- [ ] Review all Phase 0 documentation
- [ ] Create detailed implementation plan
- [ ] Identify potential risks
- [ ] Confirm development timeline

**Outputs:**
- PROMPT_0_OUTCOME.md

**Notes:**
- This is Prompt 0 from docs/phase-0/10_CLAUDE_CODE_PROMPTS.md
- Will keep Claude Code chat open through all Phase 1 prompts

**Result**
3. Testing Before Moving to Next Prompt
For Prompt 0, verify:

 All 3 documentation files reviewed and understood
 Implementation plan aligns with specifications
 Folder structure matches project needs
 Timeline is realistic for your availability
 All required API keys/credentials are obtainable
 No blocking questions remain
4. Pre-Next-Prompt Actions (Besides Testing)
Obtain API Keys:

Supabase: Create project at supabase.com
Anthropic: Get API key at console.anthropic.com
DeepSeek: Get API key at platform.deepseek.com
Resend: Get API key at resend.com
Optional but Recommended:

Set up Google OAuth credentials (can defer to later)
Configure a custom domain for Resend emails
Environment Setup:

Ensure Node.js 18+ installed
Ensure npm or pnpm available
Generate NEXTAUTH_SECRET
5. What is Completed in Prompt 0
 Reviewed all Phase 0 documentation (3 files)
 Validated technology stack choices
 Designed project folder structure
 Confirmed 11-prompt sequence is logical
 Identified critical dependencies
 Estimated time for each prompt
 Mapped integration points
 Documented critical success factors
 Listed potential challenges with mitigations
 Created timeline breakdown
 Completed risk assessment
 Created environment variables template
 Created pre-implementation checklist

---

### ⏳ Prompt 1: Project Setup & Configuration

**Status:** Not Started  
**Estimated Duration:** 0.5 day

**Objectives:**
- [ ] Initialize Next.js 14 project
- [ ] Install all dependencies
- [ ] Configure shadcn/ui
- [ ] Create folder structure
- [ ] Set up environment variables template
- [ ] Verify dev server runs

**Environment Variables Needed:**
- DATABASE_URL (from Supabase)
- NEXTAUTH_SECRET (generate with openssl)
- ANTHROPIC_API_KEY (from console.anthropic.com)
- DEEPSEEK_API_KEY (from platform.deepseek.com)
- RESEND_API_KEY (from resend.com)
- GOOGLE_CLIENT_ID (from Google Cloud Console)
- GOOGLE_CLIENT_SECRET (from Google Cloud Console)

3. What to Test Before Considering Complete
Development Server:


npm run dev
Visit http://localhost:3000 - Landing page should show
Visit http://localhost:3000/auth/signin - Sign in placeholder
Visit http://localhost:3000/auth/signup - Sign up placeholder
Visit http://localhost:3000/dashboard - Dashboard placeholder
Build Test:


npm run build
Lint Test:


npm run lint
TypeScript: Check no red squiggles in IDE

4. Before Moving to Prompt 2
Set up Supabase (if not done):

Create project at supabase.com
Get DATABASE_URL and DIRECT_URL
Update .env.local with at minimum:


DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="[generated]"
Optional - Other API keys can wait:

Anthropic, DeepSeek, Resend, Upstash, Google OAuth
5. What Was Completed in Prompt 1
Category	Items
Project Setup	Next.js 14, TypeScript, Tailwind, ESLint
Dependencies	35+ packages (core, UI, utilities)
Folder Structure	Complete src/ structure with app routes
shadcn/ui	10 components (Button, Card, Input, etc.)
Lib Files	utils, constants, validations, prisma, language-detection
Type Definitions	API types, database types
Configuration	tsconfig, tailwind, next.config, eslint, postcss
Environment	.env.example template
Git	Repository initialized, initial commit
Landing Page	Full marketing page with features & pricing
Placeholder Pages	Auth and dashboard placeholders
Total: 58 files committed

The full outcome documentation is saved at docs/phase-0/PROMPT_1_OUTCOME.md.

---

### ⏳ Prompt 2: Database Schema & Prisma Setup

**Status:** Not Started  
**Estimated Duration:** 0.5 day

**Objectives:**
- [ ] Implement Prisma schema from 04_DATA_MODEL.md
- [ ] Connect to Supabase
- [ ] Create and apply initial migration
- [ ] Generate Prisma Client
- [ ] Test database connection
- [ ] Verify CRUD operations

**Database Details:**
- **Service:** [To be determined]
- **Connection:** [To be added to .env.local]
- **Tables:** 8 tables (User, Review, ReviewResponse, etc.)

3. What to Test Before Considering Complete
Database Connection Test:


npx tsx scripts/test-db.ts
Should show all tests passing

Prisma Studio:


npx prisma studio
Opens at http://localhost:5555 - verify all 10 tables exist

Application Build:


npm run build
Should complete without database-related errors

Development Server:


npm run dev
Should start without Prisma errors

4. Before Moving to Prompt 3
Required:

Database connection is verified (test passed)
.env.local has correct DATABASE_URL and DIRECT_URL
For Prompt 3 (Authentication):

Google OAuth credentials ready (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
NEXTAUTH_SECRET is set (already done)
5. What Was Completed in Prompt 2
Category	Items
Prisma Schema	10 models with full relations and indexes
Database Tables	users, accounts, sessions, verification_tokens, brand_voices, reviews, review_responses, response_versions, credit_usage, sentiment_usage
Indexes	31 indexes for query optimization
Type Definitions	Re-exported Prisma types + custom composite types
Utility Functions	11 database utilities including atomic credit operations
Test Script	Database connection and CRUD test
Documentation	PROMPT_2_OUTCOME.md
Repository: https://github.com/prajeenv/BrandsIQ

Latest Commit: ea0483c - feat: Implement database schema with Prisma (Prompt 2)

---

### ⏳ Prompt 3: Authentication System

**Status:** Not Started  
**Estimated Duration:** 1.5 days

**Objectives:**
- [ ] Configure NextAuth.js v5
- [ ] Implement email/password authentication
- [ ] Implement Google OAuth
- [ ] Create signup/login pages
- [ ] Set up email verification flow
- [ ] Create password reset flow
- [ ] Implement protected routes middleware
- [ ] Test all authentication flows

---
3. What to Test Before Considering Complete
Signup Flow: Create account at /auth/signup, verify password strength indicator works
Email Verification: Check Resend logs for verification email (requires RESEND_API_KEY)
Login: Try logging in at /auth/signin with unverified email (should fail), then verified (should work)
Google OAuth: If configured, test "Continue with Google" button
Password Reset: Test forgot password flow at /auth/forgot-password
Protected Routes: Access /dashboard while logged out (should redirect to signin)
Build: Run npm run build - should complete without errors
4. Before Moving to Prompt 4
Required Environment Variables:


# Already set from Prompt 2
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="<generate with: openssl rand -base64 32>"

# Required for email verification
RESEND_API_KEY="re_..."

# Optional - for Google OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Optional - for production rate limiting
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."
5. What Was Completed
Category	Items
Auth Configuration	NextAuth v5 setup with Prisma adapter, JWT sessions, Google + Credentials providers
API Routes	6 auth endpoints (signup, verify-email, resend-verification, password-reset/request, password-reset/confirm, [...nextauth])
Auth Pages	6 pages (signin, signup, verify-email, forgot-password, reset-password, error)
Components	LoginForm, SignupForm with password strength indicator, SessionProvider
Utilities	Email service (Resend), Rate limiting (Upstash/in-memory), Token management
Middleware	Protected routes for /dashboard, /reviews, /settings, /api/*
Security	Headers (X-Frame-Options, HSTS, etc.), bcrypt (12 rounds), rate limiting
Repository: https://github.com/prajeenv/BrandsIQ

Commit: 4c90aa9 - feat: Implement complete authentication system (Prompt 3

### ⏳ Prompt 4: Dashboard & Core UI

**Status:** Not Started  
**Estimated Duration:** 2 days

**Objectives:**
- [ ] Create dashboard layout with sidebar
- [ ] Build dashboard home page
- [ ] Create review list page
- [ ] Build add review page
- [ ] Implement shared UI components
- [ ] Add loading and error states
- [ ] Ensure responsive design

---
3. What to Test
Authentication Flow:

Sign in and verify redirect to dashboard
Verify user name displays in welcome message
Test logout from user dropdown menu
Dashboard Layout:

Desktop: Verify sidebar is visible on left (64rem+)
Mobile: Verify hamburger menu opens sheet sidebar
Verify credit badge in header shows correct value
Dashboard Stats:

Verify quota cards show correct remaining/total
Verify stats cards show 0 for new users
Verify "Add Review" button is visible and links correctly
Empty State:

New user should see "No reviews yet" empty state
CTA button should link to /dashboard/reviews/new
Responsive Design:

Test on mobile (< 640px)
Test on tablet (640px - 1024px)
Test on desktop (> 1024px)
4. Before Moving to Next Prompt
No additional setup required. Environment variables from Prompt 3 are sufficient.

5. What Was Completed
New Components Created:

src/components/dashboard/Sidebar.tsx - Responsive sidebar navigation
src/components/dashboard/DashboardHeader.tsx - Header with user menu & credits
src/components/dashboard/StatsCard.tsx - StatsCard & QuotaCard components
src/components/dashboard/EmptyState.tsx - Empty state & EmptyReviews
src/components/shared/LoadingSpinner.tsx - Loading spinner & LoadingPage
src/components/shared/ErrorBoundary.tsx - Error boundary & ErrorMessage
New API Route:

src/app/api/dashboard/stats/route.ts - Dashboard data endpoint
Updated Files:

src/app/(dashboard)/layout.tsx - Full dashboard layout with sidebar
src/app/(dashboard)/dashboard/page.tsx - Dashboard with real stats
src/lib/constants.ts - Fixed tier limits to match spec
New UI Components (shadcn/ui):

dropdown-menu, sheet, skeleton, tooltip, scroll-area

### ⏳ Prompt 5: Review Management

**Status:** Not Started  
**Estimated Duration:** 1.5 days

**Objectives:**
- [ ] Implement review CRUD API endpoints
- [ ] Integrate language detection (franc library)
- [ ] Connect forms to API
- [ ] Implement filters and search
- [ ] Add edit/delete functionality
- [ ] Test all operations

---
3. What to Test Before Considering Complete
Authentication Flow:

 Log in with existing account
 Verify dashboard loads correctly
Add Review:

 Navigate to /dashboard/reviews/new
 Enter review text (verify language detection appears)
 Test with different languages (Spanish, French, etc.)
 Select platform, add rating (1-5 stars), add reviewer name
 Submit and verify redirect to detail page
 Verify sentiment badge appears (positive/neutral/negative)
Reviews List:

 Navigate to /dashboard/reviews
 Verify reviews appear in list
 Test platform filter dropdown
 Test sentiment filter dropdown
 Test pagination (if you have more than 10 reviews)
 Click on a review to go to detail page
Review Detail:

 View review with all details
 Verify language and sentiment badges
 Click Edit to go to edit page
 Click Delete and confirm deletion works
Edit Review:

 Modify review text
 Verify language re-detection occurs
 Save and verify changes persist
Edge Cases:

 Try adding a review with text < 10 characters (should show "low confidence" language)
 Try adding duplicate review within 5 minutes (should show error)
 Try adding review with 2000+ characters (should show validation error)
4. Before Moving to Next Prompt
Environment Variables to Set (if not already):


# Required for Prompt 6 (AI Response Generation)
ANTHROPIC_API_KEY="sk-ant-..."

# Optional for sentiment (has fallback)
DEEPSEEK_API_KEY="sk-..."
Verify:

Database connection works (npm run db:studio to check)
All reviews appear correctly
User has credits remaining (check dashboard stats)
5. What Was Completed in Prompt 5
API Endpoints (5 total):

POST /api/reviews - Create review with language detection & sentiment
GET /api/reviews - List with pagination & filters
GET /api/reviews/[id] - Single review with response/versions
PUT /api/reviews/[id] - Update with language re-detection
DELETE /api/reviews/[id] - Delete with cascade
Services:

src/lib/ai/deepseek.ts - Sentiment analysis with fallback
UI Components:

ReviewForm.tsx - Complete form with language detection
ReviewCard.tsx - Card display with badges and actions
ReviewList.tsx - Paginated list with filters
Pages:

/dashboard/reviews - Reviews listing
/dashboard/reviews/new - Add new review
/dashboard/reviews/[id] - Review detail
/dashboard/reviews/[id]/edit - Edit review

### ⏳ Prompt 6: Brand Voice Configuration

**Status:** Not Started  
**Estimated Duration:** 1 day

**Objectives:**
- [ ] Create brand voice API endpoints
- [ ] Build settings page
- [ ] Implement tone/formality controls
- [ ] Add key phrases management
- [ ] Create sample responses system
- [ ] Test brand voice persistence

---
3. What to Test
Login at http://localhost:3000/auth/signin
Navigate to Settings → Brand Voice (sidebar or /dashboard/settings/brand-voice)
Test tone selection - Click each tone option
Test formality slider - Drag from 1 to 5
Test key phrases - Add/remove phrases, try max 20
Test sample responses - Add/edit/remove samples, try max 5
Test style notes - Enter text, verify 500 char limit
Save changes - Verify success toast and "Saved" button state
Reset to defaults - Verify reset functionality
Test response panel - Try sample reviews (requires ANTHROPIC_API_KEY)
Verify API directly:
GET /api/brand-voice - Should return brand voice
PUT /api/brand-voice - Update settings
POST /api/brand-voice/test - Test with sample review
4. Before Next Prompt
Required:

Ensure ANTHROPIC_API_KEY is set in .env.local for the test response feature to work
Optional:

Test the brand voice test panel with different review texts and tones
5. What Was Completed
✅ Brand Voice API - GET /api/brand-voice
✅ Brand Voice API - PUT /api/brand-voice
✅ Brand Voice API - POST /api/brand-voice/test
✅ Claude AI service (src/lib/ai/claude.ts)
✅ ToneSelector component
✅ FormalitySlider component (added shadcn/ui slider)
✅ KeyPhrasesInput component
✅ SampleResponsesInput component
✅ TestResponsePanel component
✅ BrandVoiceForm component
✅ Settings overview page (/dashboard/settings)
✅ Brand Voice settings page (/dashboard/settings/brand-voice)
✅ Updated constants with brand voice tones and limits
✅ Updated validations with brand voice schema
✅ Cleaned up debug logging from auth.ts
✅ Build passes with no errors

### ✅ Prompt 7: AI Response Generation

**Status:** Completed
**Estimated Duration:** 2 days

**Objectives:**
- [x] Integrate Claude API
- [x] Implement response generation endpoint
- [x] Create regeneration with tone options
- [x] Build response editor component
- [x] Implement credit deduction logic
- [x] Add version history
- [x] Test multi-language generation

### 4. What to Test Before Considering Complete

**Generate Response Flow:**
1. Navigate to a review without response (`/dashboard/reviews/[id]`)
2. Click "Generate Response" button
3. Select tone option (Default, Professional, Friendly, Empathetic)
4. Click "Generate Response" - verify response appears
5. Verify 1 credit was deducted (check dashboard stats)
6. Verify response displays correctly with RTL support for Arabic/Hebrew

**Regenerate Flow:**
1. On a review with existing response, click "Regenerate" button
2. Select different tone in dialog
3. Click "Regenerate" - verify new response appears
4. Verify 1 credit deducted
5. Check version history shows previous version

**Edit Flow:**
1. Click "Edit" on existing response
2. Modify text, verify character counter works
3. Save changes - verify no credits deducted
4. Verify response marked as "Edited"
5. Check version history shows edit

**Publish/Approve Flow:**
1. Click "Approve" on response
2. Verify "Approved" badge appears
3. Verify publishedAt timestamp set

**Copy Flow:**
1. Click "Copy" button
2. Paste in text editor
3. Verify response text copied correctly

**Version History:**
1. Generate response, regenerate a few times
2. Expand version history section
3. Verify older versions are listed with their tone and credit info

### 5. Before Moving to Next Prompt

**Required:**
- Ensure ANTHROPIC_API_KEY is set in `.env.local`

**Verify:**
- User has credits remaining (check `/dashboard` stats)
- At least one review exists without response for testing

### 6. What Was Completed in Prompt 7

**API Endpoints (4 total):**
- `POST /api/reviews/[id]/generate` - Generate initial AI response
- `POST /api/reviews/[id]/regenerate` - Regenerate with tone modifier
- `PUT /api/reviews/[id]/response` - Edit response manually
- `POST /api/reviews/[id]/publish` - Mark as approved

**UI Components (4 total):**
- `ResponsePanel.tsx` - Main response display with all actions
- `ResponseEditor.tsx` - Inline text editor
- `ToneModifier.tsx` - Dialog for tone selection
- `ResponseVersionHistory.tsx` - Collapsible version list

**Pages:**
- `/dashboard/reviews/[id]/generate` - Generate response page with tone options

**Updates:**
- Updated Claude service to support tone modifiers
- Updated review detail page with ResponsePanel
- Added new shadcn/ui components (Alert, RadioGroup, Collapsible)

---

### ✅ Prompt 8: Sentiment Analysis

**Status:** Completed
**Estimated Duration:** 1 day

**Objectives:**
- [x] Integrate DeepSeek API
- [x] Implement automatic sentiment on review save
- [x] Create sentiment usage history endpoint
- [x] Implement sentiment quota tracking
- [x] Add sentiment distribution to dashboard

### 4. What to Test Before Considering Complete

**Sentiment on Review Creation:**
1. Navigate to `/dashboard/reviews/new`
2. Add a clearly positive review (e.g., "This product is amazing! Best purchase ever!")
3. Submit and verify "positive" sentiment badge appears
4. Add a clearly negative review (e.g., "Terrible experience, worst product ever!")
5. Verify "negative" sentiment badge appears
6. Add a neutral review (e.g., "The product arrived on time. It works as expected.")
7. Verify "neutral" sentiment badge appears

**Sentiment Quota:**
1. Check dashboard - verify "Sentiment Analysis" quota card shows used/total
2. Add reviews and verify `sentimentUsed` counter increments
3. Verify sentiment quota is separate from response credits

**Sentiment Distribution:**
1. After adding several reviews with different sentiments
2. Check dashboard - verify "Sentiment Distribution" card appears
3. Verify stacked bar chart shows correct percentages
4. Verify legend shows positive/neutral/negative with percentages

**Sentiment Usage API:**
1. Test `GET /api/sentiment/usage` endpoint
2. Verify it returns usage history with sentiment values
3. Verify it returns distribution percentages
4. Verify it returns quota information

**Fallback (without DeepSeek API key):**
1. Remove DEEPSEEK_API_KEY from `.env.local`
2. Restart server
3. Add review with positive/negative text
4. Verify fallback keyword analysis still works

### 5. Before Moving to Next Prompt

**Required:**
- Ensure reviews exist with sentiment data for testing
- Verify dashboard shows sentiment distribution

**Optional:**
- Set DEEPSEEK_API_KEY for more accurate sentiment analysis
- If not set, fallback keyword analysis works but with lower confidence

### 6. What Was Completed in Prompt 8

**API Endpoints (1 new):**
- `GET /api/sentiment/usage` - Get sentiment usage history with distribution stats

**Service Layer (pre-existing, verified):**
- `src/lib/ai/deepseek.ts` - DeepSeek API client with fallback analysis

**Dashboard Updates:**
- `SentimentDistributionCard` component - Stacked bar chart with legend
- Dashboard stats API now returns `sentimentDistribution` data

**Review Integration (pre-existing, verified):**
- `POST /api/reviews` - Already runs sentiment analysis on creation
- Sentiment quota tracking already in place
- `SentimentUsage` audit logging already working

**UI Components (pre-existing, verified):**
- Sentiment badges in ReviewCard (green/gray/red colors)
- Sentiment quota in dashboard QuotaCard

---

### ✅ Prompt 9: Credit System

**Status:** Completed
**Estimated Duration:** 1 day

**Objectives:**
- [x] Implement credit tracking infrastructure (already existed from Prompts 5-8)
- [x] Create credit API endpoints
- [x] Build usage history page
- [x] Add low credit warnings
- [x] Create monthly reset utility function
- [x] Verify fraud prevention measures

### 4. What to Test Before Considering Complete

**Credit Balance Display:**
1. Navigate to `/dashboard` - verify credit quota card shows correct remaining/total
2. Check "Sentiment Analysis" quota card shows correct values
3. Verify reset date displays correctly in quota cards

**Credit API:**
1. Test `GET /api/credits` - should return credit and sentiment quota info
2. Test `GET /api/credits/usage` - should return paginated usage history
3. Test usage filters: action type, date range
4. Verify pagination works with page/limit params

**Credit Usage History Page:**
1. Navigate to `/dashboard/settings/usage`
2. Verify usage records table displays correctly
3. Test action type filter dropdown
4. Test date range filters
5. Test CSV export button (downloads file with records)
6. Test pagination controls

**Low Credit Warning:**
1. If you have < 3 credits, yellow warning banner should appear on dashboard
2. If you have 0 credits, red alert should appear
3. Test dismiss button (X) hides the warning
4. Verify "Upgrade Plan" button links to pricing page

**Pricing Page:**
1. Navigate to `/pricing`
2. Verify 3 tiers display: FREE, STARTER, GROWTH
3. Verify "Current Plan" badge shows on your tier
4. Verify "Coming Soon" buttons are disabled
5. Check FAQ section displays correctly

**Settings Page:**
1. Navigate to `/dashboard/settings`
2. Verify "Credit Usage History" link is clickable
3. Verify "Billing & Subscription" links to pricing page

**Generate Response (Credit Deduction):**
1. Generate a response on a review
2. Verify credit deducted (check dashboard or /api/credits)
3. Verify usage appears in `/dashboard/settings/usage`

### 5. Before Moving to Next Prompt

**Required:**
- All credit APIs working correctly
- Usage history page displaying data
- Low credit warning showing when appropriate

**Optional:**
- Test with multiple reviews to generate usage history
- Verify CSV export works correctly

### 6. What Was Completed in Prompt 9

**API Endpoints (2 new):**
- `GET /api/credits` - Returns credit balance, sentiment quota, and tier
- `GET /api/credits/usage` - Paginated usage history with filters

**Pages (2 new):**
- `/dashboard/settings/usage` - Credit usage history with table, filters, CSV export
- `/pricing` - Pricing page with 3 tiers and FAQ

**Components (1 new):**
- `LowCreditWarning.tsx` - Dismissible alert banner for low/zero credits

**Utilities (1 enhanced):**
- `resetMonthlyCredits()` - Batch reset function for cron job use (anniversary-based: 30 days per user)
- `shouldResetCredits()` - Check if user needs reset
- `getNextResetDate()` - Calculate next reset date (30 days from current reset date)

**Updates:**
- Settings page now includes "Credit Usage History" and "Billing & Subscription" links
- Dashboard page includes LowCreditWarning component

**Pre-existing (verified working):**
- `deductCreditsAtomic()` - Atomic credit deduction with fraud prevention
- `CreditUsage` table logging all operations
- QuotaCard component displaying credits
- 402 status code for insufficient credits

**Post-Prompt 9 Enhancement (January 20, 2026):**
- Standardized sentiment credits from usage model to balance model
- Changed from `sentimentUsed` + `sentimentQuota` to single `sentimentCredits` field
- Matches how response credits work for consistency
- Modified 10 files: schema, db-utils, auth, signup, 4 API routes, types, test script
- Database migration SQL provided in DECISIONS.md

**Post-Prompt 9 Enhancement (January 30, 2026):**
- Added `OutOfCreditsDialog` component for better UX when user has no credits
- Replaced vanishing toast errors with persistent modal dialog
- Shows credits remaining, reset date, and upgrade CTA
- Integrated in ResponsePanel, review detail page, and generate page
- Extended `CreditsProvider` to include `creditsTotal` and `creditsResetDate`

---

### ✅ Prompt 10: Testing, Deployment & Finalization

**Status:** Completed (Testing phase)
**Estimated Duration:** 2 days

**Objectives:**
- [x] Complete end-to-end testing
- [x] Test all error scenarios
- [x] Verify multi-language support (language detection tested)
- [x] Deploy to Vercel (staging live)
- [ ] Set up monitoring (Sentry) — deferred
- [x] Configure cron jobs (credit reset cron from Prompt 9)
- [x] Finalize documentation
- [ ] Prepare for beta launch — operational task

### What Was Completed in Prompt 10

**Unit Tests (447 tests, 30 files):**
- Pure logic: `utils.ts`, `validations.ts`, `language-detection.ts`, `constants.ts` (190 tests)
- Library modules with mocking: `tokens.ts`, `rate-limit.ts`, `deepseek.ts`, `claude.ts`, `email.ts`, `db-utils.ts` (104 tests)
- API routes: all 20 endpoints across auth, reviews, brand-voice, credits, dashboard, cron (129 tests)
- Components: `StatsCard`, `QuotaCard`, `LowCreditWarning`, `EmptyState`, `EmptyReviews` (24 tests)

**Integration Tests (11 tests, 2 files):**
- `credit-operations.test.ts` — atomic deductions, cascade deletes, audit trail preservation, sentiment credits
- `review-lifecycle.test.ts` �� create → generate → edit → regenerate → publish, version tracking, filtering

**E2E Tests (16 tests, 3 files, Playwright):**
- `landing.spec.ts` — hero section, navigation links, page transitions
- `auth.spec.ts` — sign in/up forms, forgot password, protected route redirects
- `pricing.spec.ts` — tier display, correct prices

**Test Infrastructure:**
- 7 shared helper files: `fixtures.ts`, `prisma-mock.ts`, `auth-mock.ts`, `api-test-helpers.ts`, `ai-mocks.ts`, `email-mock.ts`, `integration/helpers.ts`
- Updated `vitest.config.ts` with coverage exclusions for `src/components/ui/`
- Updated `tests/setup.ts` with default env vars for CI
- `playwright.config.ts` with Vercel Deployment Protection bypass

**CI/CD Integration:**
- `e2e-staging.yml` — runs Playwright after staging deploy, creates GitHub Issue on failure
- Updated `deploy-production.yml` — gates production deploy on latest E2E status
- Scripts: `test:e2e`, `test:e2e:headed`

**PR:** prajeenv/BrandsIQ#6

---

## Development Environment

### Local Setup
```bash
# Dev server
npm run dev
# http://localhost:3000

# Database (Prisma Studio)
npx prisma studio
# http://localhost:5555
```

### Key Services
- **Database:** [Not yet configured]
- **Hosting:** Vercel (not yet deployed)
- **Email:** Resend
- **AI:** Claude API + DeepSeek API

### Repository
- **GitHub:** [repository-url]
- **Current Branch:** main
- **Last Commit:** [to be added]

---

## Issues & Blockers

### Active Issues
*None yet - Phase 1 not started*

### Resolved Issues
*None yet*

---

## Next Steps

1. **Immediate:** Execute Prompt 0 (Planning & Architecture Review)
2. **Today:** Complete Prompts 0-1 (Planning + Project Setup)
3. **This Week:** Complete Prompts 0-5 (Foundation + Core Features)
4. **Next Week:** Complete Prompts 6-10 (AI Features + Deployment)

---

## Notes & Learnings

### Week 1 Notes
*To be added as development progresses*

### Key Insights
*To be added as development progresses*

### Challenges Overcome
*To be added as development progresses*

---

## Time Tracking

| Prompt | Estimated | Actual | Variance | Notes |
|--------|-----------|--------|----------|-------|
| 0 | 0.5 days | - | - | - |
| 1 | 0.5 days | - | - | - |
| 2 | 0.5 days | - | - | - |
| 3 | 1.5 days | - | - | - |
| 4 | 2.0 days | - | - | - |
| 5 | 1.5 days | - | - | - |
| 6 | 1.0 days | - | - | - |
| 7 | 2.0 days | - | - | - |
| 8 | 1.0 days | - | - | - |
| 9 | 1.0 days | - | - | - |
| 10 | 2.0 days | - | - | - |
| **Total** | **14 days** | **-** | **-** | **-** |

---

## Checklist for Phase 1 Completion

### MVP Features
- [ ] User authentication (email + OAuth)
- [ ] Manual review input
- [ ] AI response generation
- [ ] Brand voice customization
- [ ] Multi-language support (5+ languages tested)
- [ ] Sentiment analysis
- [ ] Credit system working
- [ ] Dashboard functional

### Technical Requirements
- [ ] All acceptance criteria met
- [ ] Database deployed to production
- [ ] Application deployed to Vercel
- [ ] Environment variables configured
- [ ] Error tracking enabled (Sentry)
- [ ] Monitoring set up
- [ ] Documentation complete

### Testing
- [x] End-to-end user journey tested (16 Playwright E2E tests)
- [x] All authentication flows working (35 auth API unit tests + E2E auth tests)
- [ ] Response generation <5 seconds (requires manual verification)
- [x] Credit tracking 100% accurate (atomic transaction tests + integration tests)
- [x] Multi-language verified (language detection unit tests)
- [x] Error handling comprehensive (129 API route tests covering all error codes)

### Launch Readiness
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Cookie consent implemented
- [ ] GDPR data export working
- [ ] GDPR account deletion working
- [ ] 5 beta users ready to onboard

---

**Last Updated:** March 27, 2026
**Status:** Prompt 10 complete (Testing) - 474 tests (447 unit + 11 integration + 16 E2E), CI/CD fully integrated

---

## MVP Phase 1 (Closed Beta)

**Source of truth:** `docs/MVP_Phase-1/MVP.md`
**Started:** May 9, 2026
**Branch:** `feat/mvp-phase-1-iteration-1`

The closed-beta layer added on top of the original Core MVP. Validates product-market fit through invite-gated signups before MVP Phase 2 (Stripe + commercial launch) is built. Implementation broken into 3 iterations.

### Iteration plan

| Iter. | Scope | Status |
|------|-------|--------|
| 1 | Schema + lib helpers + invite-code APIs + admin UI + signup integration + tests | ✅ Done |
| 2 | `/onboarding` wizard + `FounderInquiryForm` + phase-aware dialogs + closed-beta pricing banner | ✅ Done |
| 3 | PostHog event taxonomy + Sentry coverage + `Review.locationId` non-null contract migration + final doc pass | ✅ Done |

### ✅ Iteration 1 — Schema, Beta Plan, Invite-Code Signup, Admin Page

**Branch:** `feat/mvp-phase-1-iteration-1` (5 commits)

**What shipped:**
- **Schema** — `Location`, `BetaInviteLink`, `FounderInquiry` models; `User.isBetaUser` + 7 nullable profile fields; `Review.locationId` (nullable in this iteration)
- **Constants & helpers** — `BETA_PLAN` (150/750), `BETA_INVITE_EXPIRY_DAYS` (60), `getEffectiveAllocation`, `isFounder`/`isFounderEmail`, `getCurrentPhase`
- **db-utils** — `resetMonthlyCredits` and `resetUserCredits` now honor `isBetaUser`; audit log records the flag
- **APIs** — `POST/GET /api/admin/beta-invites` (founder-only), `GET /api/beta-invites/[code]/validate` (public), `POST/DELETE /api/auth/stash-invite` (HttpOnly cookie for OAuth round-trip), `POST /api/auth/signup` accepts `betaCode` with atomic transaction
- **NextAuth** — `events.signIn` reads invite cookie when `isNewUser` and applies beta plan in a transaction; phase flag short-circuits in `phase_2`
- **UI** — `SignupForm` shows beta-invite banner when `?b=<valid-code>`; `/auth/beta-link-expired` (placeholder mailto recovery); `/onboarding` (placeholder); `/dashboard/admin/beta-invites` (table + generate button); `Sidebar` conditionally shows admin section for founder
- **Middleware** — gates `/dashboard/admin/*` and `/api/admin/*`; non-founders get 404 (no route disclosure)
- **Tests** — 23 new unit tests, 5 new integration tests, 5 new E2E specs. Total: **604 unit / 11 skipped (integration), 0 failures**
- **One-shot script** — `scripts/backfill-locations.ts` (idempotent, dry-run by default; creates "Default Location" per user and links existing reviews)
- **Docs** — `docs/MVP_Phase-1/MVP.md` tracked in git with 4 implementation amendments; new sections in `DECISIONS.md` (8 decisions logged) and this PROGRESS.md section

**New env vars:**
- `FOUNDER_EMAILS=prajeen.builder@gmail.com` — comma-separated list gating admin UI/APIs
- `CURRENT_PHASE=phase_1` — defaults to `phase_1` if unset; flip to `phase_2` at commercial launch

**Verification before merge (per plan):**
- ✅ `npm run lint:strict` clean
- ✅ `npm run type-check` clean
- ✅ `npm run test:unit` (604 passed, 11 skipped, 0 failed)
- ⏳ Integration tests require `DATABASE_URL` with `localhost` — to be verified by CI's PostgreSQL container
- ⏳ Manual smoke test on staging (7-step checklist in `C:\Users\amith\.claude\plans\please-have-a-look-generic-wozniak.md`)

**Decisions** (cross-reference DECISIONS.md "MVP Phase 1: Pre-Launch Beta" section):
- User-as-account (skip standalone Account model)
- `CURRENT_PHASE` env var, not DB row
- OAuth invite-code via short-lived HttpOnly cookie
- No auto-confirmation email to inquirers
- `FOUNDER_EMAILS` env-var admin gate
- `Review.locationId` two-phase migration (nullable → non-null in iteration 3)
- Manual one-shot backfill via tsx
- Beta plan is `isBetaUser` flag, not Tier enum value

### ✅ Iteration 2 — Onboarding wizard + Founder-inquiry form + Phase-aware dialogs + Closed-beta pricing banner

**Branch:** `feat/mvp-phase-1-iteration-2` (4 commits)
**Status:** Locally verified (lint/type-check/652 unit tests passing). PR pending.

**What shipped:**

- **Real `/onboarding` wizard** — single-page form (organisation name, industry, country, location name + optional location count + primary platform + conditional intent question for non-beta users). Submits to `PATCH /api/user/profile` which transactionally updates the user, upserts the "Default Location" (rename if it exists from iteration 1's backfill, create if not), and conditionally creates a FounderInquiry of `type=beta_request` with `source=onboarding_intent` for non-beta users who signal intent.
- **`FounderInquiryForm` shared component** — used in four places (expired-link page, pricing-page banner CTA, OutOfCreditsDialog, LowCreditWarning). Parameterised by `type` (4 variants: beta_request | more_credits | general | expired_link_recovery) and `source` (5 variants for PostHog correlation). Copy auto-adapts per type. Optional pre-fill + hide-submitter-fields mode for signed-in CTAs.
- **Phase-aware dialogs** — `OutOfCreditsDialog` swaps content in-place between "out of credits" summary and the embedded inquiry form when `currentPhase === phase_1`. `LowCreditWarning` opens a nested dialog with the form. Both backward-compatible; `phase_2` behaviour identical to iteration 1.
- **Closed-beta banner on `/pricing`** — prominent banner with "Request beta access" CTA opens the form in a dialog. Per-tier "Coming Soon" buttons replaced with "Request beta access" buttons under `phase_1`. Server-component wrapper reads `getCurrentPhase()` so the env var stays out of the client bundle.
- **Founder-only admin: `/dashboard/admin/founder-inquiries`** — table with type filter (4 values + All) + status filter (Open / Resolved / All; default Open). Click-row opens details dialog with submitter info + message + founder-notes textarea + mark-resolved / re-open actions. Same lo-fi 404-gate as iteration 1's admin pages.
- **API surface** — 4 new routes (`POST /api/founder-inquiries`, `GET /api/admin/founder-inquiries`, `PATCH /api/admin/founder-inquiries/[id]`, `PATCH /api/user/profile`). Existing `/api/dashboard/stats` and `/api/credits` now emit `isBetaUser` in their responses (was selected but not surfaced).
- **Sidebar** — "Founder inquiries" admin nav item alongside "Beta invites". Inbox icon.
- **Layout split** — `(dashboard)/layout.tsx` now a server component reading `getCurrentPhase()` and forwarding to `(dashboard)/layout-client.tsx`. Same pattern at `/pricing/page.tsx` + `/pricing/pricing-client.tsx`. Phase value threaded through `CreditsProvider` → all phase-aware client components read it via `useCredits()`.
- **No new env vars.** Iteration 1 already shipped `FOUNDER_EMAILS` and `CURRENT_PHASE`.

**Test coverage delta:**

| Type | Before | After | New |
|---|---|---|---|
| Unit tests | 611 passing | 652 passing | +41 (across 4 files) |
| Integration scenarios | 5 (iter. 1) | 10 (iter. 1+2) | +5 (new file `onboarding-flow.test.ts`) |
| E2E specs | 5 (iter. 1) | 12 (iter. 1+2) | +7 (new file `iteration-2-surfaces.spec.ts`) |
| Test files | 49 | 53 | +4 |

**Verification status:**
- ✅ `npm run lint:strict` clean
- ✅ `npm run type-check` clean
- ✅ `npm run test:unit` 652 passed, 22 skipped (integration require localhost DB), 0 failed
- ⏳ Integration tests will run in CI's PostgreSQL container
- ⏳ Staging smoke test pending (similar 7-step manual checklist as iteration 1)

**Decisions** (cross-reference DECISIONS.md "Iteration 2" subsection):
- Single-page form, not multi-step wizard
- Closed-set Industries/Countries with "Other" escape hatch
- Location name is a label, not a postal address
- Phase flag threads via server-component wrapper, never reaches client bundle
- OutOfCreditsDialog swaps content in-place (no nested dialogs)
- One shared FounderInquiryForm parameterised by type + source
- No auto-confirmation email to inquirer; replyTo set for founder convenience
- Public POST /api/founder-inquiries rate-limited, refuses no-email submissions
- Onboarding submission transactional; notification via `waitUntil`

### ✅ Iteration 3 — Observability + cleanup + final doc pass

**Status:** Complete. Shipped to main + deployed to production across PRs #104/#105, #107, #108, #109, #110.

**What shipped:**

- **PostHog event taxonomy** (PRs #104/#105) — new `src/lib/posthog-events.ts` typed helper. Events: `signup_completed_with_beta`, `signup_completed_no_beta`, `onboarding_completed`, `beta_invite_link_used`, `founder_inquiry_submitted`, `zero_balance_dialog_shown`, `credit_balance_low`, `response_generated`, `response_regenerated`, `sentiment_analyzed`. `PostHogSessionSync` component identifies users on session change. Event properties categorical-only (industry, businessType, country, tier, isBetaUser) — no PII. `isBetaUser` added to the NextAuth JWT/session alongside `isFounder`.
- **Sentry phase-1 coverage** (PR #107) — server paths tagged `area: phase_1_*` (`phase_1_beta_allocation`, `phase_1_oauth_invite_cookie`, `phase_1_signup_beta`, `phase_1_signup`, `phase_1_founder_inquiry`, `phase_1_invite_validation`). Per-path re-throw policy by blast radius.
- **`Review.locationId` contract migration** — PR #108 (3a): `POST /api/reviews` now always sets `locationId` (defensively creates a "Default Location" inline in a `$transaction` if missing); fixed a latent bug where every app-created review since iteration 1 had `locationId = NULL`. PR #109 (3b): migration `20260517120000_review_location_id_not_null` makes the column `NOT NULL` (guarded by a `DO $$` null-count check), `schema.prisma` tightened `String?`→`String`, `scripts/backfill-locations.ts` deleted.
- **Cleanup** — PR #110 (4a): `/sentry-example-page` + `/api/sentry-example-api` scaffolding removed.
- **Docs** — final reconciliation pass: CORE_SPECS.md, IMPLEMENTATION_GUIDE.md, SECURITY_AUTH.md, DECISIONS.md (4 new decisions, #35–38), and this PROGRESS.md updated to the shipped state.

**No new env vars.**

**Decisions** (cross-reference DECISIONS.md "Iteration 3" subsection):
- PostHog event properties categorical-only / no PII
- Sentry per-path re-throw policy by blast radius
- `locationId` expand→backfill→fix→contract, 3a/3b split
- `isBetaUser` on JWT/session (value fixed per session; founder grant takes effect next sign-in)

---

**Last Updated:** May 19, 2026
**Status:** MVP Phase 1 (Closed Beta) complete — all 3 iterations shipped to main + deployed to production. PostHog taxonomy, Sentry phase-1 coverage, and the `Review.locationId` NOT NULL contract migration are live. Next: MVP Phase 2 (Commercial Launch) when the Phase 2 trigger fires.

---

## Brand Voice Page Redesign

**Source of truth:** `docs/MVP_Phase-1/BRAND_VOICE_REDESIGN.md`
**Plan:** `C:/Users/amith/.claude/plans/docs-mvp-phase-1-brand-voice-redesign-md-streamed-ripple.md`
**Started:** May 20, 2026

A four-section restructure of the brand voice settings screen (Voice / Examples / Personalization / Contact & sign-off), drop of the Formality field, fix of a JSON-render bug on Style guidelines, addition of post-processed salutation + sign-off + conditional reply-to email, rating-conditional response structure templates, and prompt-injection defenses across the brand voice fields AND review text. User confirmed all reviews/brand-voice rows are throwaway test data, eliminating the data-migration burden — Iteration 3 is a clean reset.

### Iteration plan

| Iter. | Scope | Status |
|---|---|---|
| 1 | Sanitize helper + review-text retrofit + SecurityLog | ✅ Done (May 20, merged via PR #120) |
| 2 | Validation schema + constants + normalize adapter | ✅ Done (May 20, merged via PR #121) |
| 3 | Clean-reset schema migration + route cutover + legacy form bridge | ✅ Done (May 20, merged via PR #122) |
| 4 | Prompt-building rewrite (bug fix, wrap fields, structure, fragments) | ✅ Done (May 20) |
| 5 | Post-processing module + route wiring | ⏳ Not started |
| 6 | Frontend restructure + API Zod cutover + regenerate dialog | ⏳ Not started |

### ✅ Iteration 1 — Sanitize helper + review-text retrofit + SecurityLog table

**Branch:** `feat/brand-voice-redesign-iter-1`
**Status:** Locally verified (lint:strict / type-check / 783 unit tests all passing). PR pending.

**What shipped:**

- **`src/lib/ai/sanitize.ts` (NEW)** — pure module: `wrapUserContent(label, content)` (wraps user-supplied text in clearly labeled delimiters, strips literal `<<<...>>>` spoof markers), `SUSPICIOUS_PATTERNS` + `detectInjectionAttempt(text)` (returns matched-pattern source strings for non-blocking logging), `INSTRUCTION_REINFORCEMENT` constant (security lines only this iteration; structural/length lines added iter 4).
- **`src/lib/security-log.ts` (NEW)** — `logIfInjectionAttempt({text, userId, fieldName})` swallows persistence errors, truncates `preview` to 200 chars to keep the GDPR surface small, exports `SecurityEventTypes`.
- **Prisma schema** — new `SecurityLog` model (`userId String?` SetNull, `eventType`, `fieldName`, `matchedPatterns String[]`, `preview String? @db.Text`, indexed on `(userId, createdAt)` and `eventType`); `User.securityLogs` back-relation. Migration `20260519180000_add_security_log/migration.sql` — pure additive `CREATE TABLE`, no `DO $$` guard needed (brand-new table).
- **`src/lib/ai/claude.ts`** — `buildUserPrompt` wraps `reviewText` via `wrapUserContent('Customer review', ...)` and accepts optional `customRegenerateInstructions` (dormant until iter 6, wrapped + binding when provided); `buildSystemPrompt` appends `INSTRUCTION_REINFORCEMENT` after the brand-voice configuration. `GenerateResponseParams` gains `customRegenerateInstructions?: string`.
- **Routes** — `POST /api/reviews/[id]/generate` and `.../regenerate` both call `logIfInjectionAttempt` on the review text immediately after the review is fetched (`fieldName: "review_text"`). Logging is non-blocking and cannot fail the generation flow.
- **No new env vars.**
- **No behavior change for clean reviews.** Reinforcement tail is purely additive content; existing tests use `toContain` and stay green.

**Test coverage delta:**

| Type | Before iter 1 | After iter 1 | New from this iteration |
|---|---|---|---|
| Unit tests (suite total) | 748 | 783 | +35 |
| New unit test files | — | — | 2 (`sanitize.test.ts`, `security-log.test.ts`) |
| Modified unit test files | — | — | 3 (`claude.test.ts`, `generate.test.ts`, `regenerate.test.ts`) |
| Integration tests | — | +3 scenarios (gated on localhost DB) | 1 new file (`security-log.test.ts`) |
| E2E specs | — | — | 0 |

**Verification status:**

- ✅ `npm run lint:strict` clean
- ✅ `npm run type-check` clean
- ✅ `npm run test:unit` 783 passed, 0 failed (60 test files)
- ⏳ Integration tests run in CI's PostgreSQL container

**Decisions** (cross-reference DECISIONS.md "Brand Voice Page Redesign / Iteration 1" subsection): #39 security retrofit ships first; #40 new SecurityLog table (not Sentry-only); #41 audit persistence in routes, `sanitize.ts` stays pure; #42 reinforcement tail has security lines only this iteration; #43 `customRegenerateInstructions` plumbed but dormant.

### ✅ Iteration 2 — Validation schema + constants + normalize adapter

**Branch:** `feat/brand-voice-redesign-iter-2`
**Status:** Locally verified (lint:strict / type-check / 871 unit tests passing). PR pending.

Pure type/validation/constant changes — zero DB changes, zero runtime behaviour change for clean inputs. Makes the new V2 contract explicit and unit-tested before the schema reset (iter 3) so iter 3 becomes "DB only". The one externally visible behaviour change is the response cap raise (500→2000), which is intentional, tested across validations + route + component layers, and documented in DECISION #45.

**What shipped:**

- **`src/lib/constants.ts`** — new exports: `BRAND_VOICE_TONES_V2` (4 lowercase keys), `BRAND_VOICE_TONE_INFO_V2` (display labels + descriptors per spec §4.1), `DEFAULT_BRAND_VOICE_TONE_V2`, `LEGACY_TONE_TO_V2` (maps every legacy key + the `"default"` sentinel from `ReviewResponse.toneUsed`), `NEGATIVE_REVIEW_FRAMINGS` + `DEFAULT_NEGATIVE_REVIEW_FRAMING`, `BRAND_VOICE_LIMITS_V2` (per-field caps from spec §4.2/§4.3/§5.1/§7.x), `RESPONSE_BODY_CHAR_MAX = 1200`. Legacy `BRAND_VOICE_TONES` / `BRAND_VOICE_TONE_INFO` / `BRAND_VOICE_LIMITS` / `FORMALITY_*` retained until iter 6 cuts the form payload over. `VALIDATION_LIMITS.RESPONSE_TEXT_MAX` raised 500 → 2000.
- **`src/lib/validations.ts`** — new `brandVoiceSchemaV2` per spec §9.2 with the lowercase-key tone enum (DECISION #44), V2 sample-response object shape (`{ratingContext: 1-5|'any', responseText}`), per-item + joined-total caps on styleGuidelines (DECISION #48), header-injection guard on `replyToEmail` (DECISION #49). Old `brandVoiceSchema` retained until iter 6 cutover. `updateResponseSchema` automatically picks up the new 2000 cap via `VALIDATION_LIMITS.RESPONSE_TEXT_MAX`.
- **`src/lib/ai/brand-voice-normalize.ts` (NEW, pure module)** — `normalizeBrandVoice(raw)` accepts any plausible payload (legacy DB row, V2 row, partial object, untrusted JSON, even `null`) and returns the canonical `NormalizedBrandVoice` shape. Legacy `styleNotes` (JSON-stringified array OR newline-separated string) → `string[]`. Legacy `sampleResponses: string[]` → `[{ratingContext: 'any', ...}]`. Legacy tones mapped via `LEGACY_TONE_TO_V2`. Unknown / malformed values fall back to defaults. Unit-tested now (DECISION #46); wired into `generateReviewResponse` in iter 4.
- **`src/lib/ai/claude.ts`** — `BrandVoiceConfig` extended with all V2 fields as optional (DECISION #47). The three inline call sites in `generate`/`regenerate`/`brand-voice/test` continue to typecheck without modification. No runtime change — the new fields are not yet read by `buildSystemPrompt` (that lands in iter 4).
- **Test fallout fixed in-iteration:** `tests/unit/lib/constants.test.ts` "RESPONSE_TEXT_MAX is 500" → 2000; `tests/unit/lib/validations.test.ts` updateResponseSchema 500-cap tests → 2000; `tests/unit/api/reviews/response-edit.test.ts` "exceeding 500 characters" → "exceeding the max length"; `tests/unit/components/reviews/response-editor.test.tsx` hard-coded `501`/`510` replaced with `VALIDATION_LIMITS.RESPONSE_TEXT_MAX + 1` / `+ 10` so future cap changes don't break the tests.

**Test coverage delta:**

| Type | Before iter 2 (suite total) | After iter 2 (suite total) | New from this iteration |
|---|---|---|---|
| Unit tests | 783 | 871 | **+88** |
| New unit test files | — | — | 1 (`tests/unit/lib/ai/brand-voice-normalize.test.ts`) |
| Modified unit test files | — | — | 3 (`validations.test.ts`, `constants.test.ts`, `response-editor.test.tsx`) |
| Test files fixed for the cap raise | — | — | 2 (`response-edit.test.ts`, `response-editor.test.tsx`) |
| Integration tests | — | — | 0 |
| E2E specs | — | — | 0 |

**Verification status:**

- ✅ `npm run lint:strict` clean
- ✅ `npm run type-check` clean
- ✅ `npm run test:unit` 871 passed, 0 failed (61 test files)
- No DB migration this iteration; nothing for `prisma migrate deploy` to run.

**Decisions** (cross-reference DECISIONS.md "Brand Voice Page Redesign / Iteration 2" subsection): #44 tone storage = lowercase keys + display map; #45 RESPONSE_TEXT_MAX 500→2000 + new RESPONSE_BODY_CHAR_MAX=1200; #46 normalizeBrandVoice in its own pure module; #47 BrandVoiceConfig extended with optional V2 fields; #48 styleGuidelines per-item AND joined-total caps; #49 replyToEmail rejects `\n`/`\r` (header-injection guard).

### ✅ Iteration 3 — Clean-reset schema migration + route cutover + legacy form bridge

**Branch:** `feat/brand-voice-redesign-iter-3`
**Status:** Locally verified (lint:strict / type-check / 902 unit tests passing). PR pending.

**The biggest schema change in the redesign.** Drops the `formality` column, replaces `styleNotes` (text storing `JSON.stringify(array)` — the headline bug) with a JSONB `style_guidelines` column, replaces `sampleResponses (String[])` with a JSONB `sample_responses` column of `{ratingContext, responseText}` objects, adds the 8 new Personalization + Contact/sign-off columns, and adds CHECK constraints on `tone` + `negative_review_framing`. Truncates `brand_voices` + `reviews` + `review_responses` + `response_versions` — all throwaway pre-launch test data per the user's explicit confirmation in the plan-decision discussion.

The brand voice form continues to work between this iteration's deploy and iter 6's form rewrite via a small adapter in `/api/brand-voice/_legacy-bridge.ts` that translates the legacy payload ↔ V2 columns in both directions. Iter 6 deletes the bridge.

**What shipped:**

- **`prisma/schema.prisma`** — `BrandVoice` model fully rewritten to the V2 shape: tone (V2 key with default `friendly_professional`), `keyPhrases String[] @map("key_phrases")`, `styleGuidelines Json @default("[]") @map("style_guidelines")`, `sampleResponses Json @default("[]") @map("sample_responses")`, `acknowledgeNamedStaff Boolean`, `acknowledgeOccasions Boolean`, `salutationPattern @db.VarChar(100)`, `signoffLines @db.Text`, `negativeReviewEmailEnabled Boolean`, `negativeReviewFraming @db.VarChar(32)`, `negativeReviewFramingCustom String? @db.Text`, `replyToEmail String? @db.VarChar(254)`.
- **`prisma/migrations/20260520120000_brand_voice_redesign_reset/migration.sql` (NEW)** — single transaction: TRUNCATE 4 tables (with RESTART IDENTITY CASCADE) → DROP `formality` + `styleNotes` + `sampleResponses` → RENAME `keyPhrases` to `key_phrases` to match Prisma `@map` → ADD V2 columns with safe defaults → ADD CHECK constraints on `tone` and `negative_review_framing` → post-condition `DO $$` guard that fails loudly if any of the four tables still has rows. Header comment explains the clean-reset rationale and links to spec + DECISIONS row 50.
- **`src/app/api/brand-voice/_legacy-bridge.ts` (NEW, pure module, deleted in iter 6)** — `fromLegacyForm(payload)` converts the legacy form's PUT payload into a V2 column write (tone via `legacyToneToV2`, `styleNotes` via `parseLegacyStyleNotes` → `styleGuidelines` string array, `sampleResponses` string[] wrapped as `{ratingContext: 'any', responseText}` objects). `toLegacyShape(row)` projects a V2 row back to the legacy response shape the form expects (V2 tone mapped via `v2ToneToLegacy`, formality stubbed at 3, `styleGuidelines` re-serialised as JSON-stringified `styleNotes`, sample objects flattened to string array).
- **`src/app/api/brand-voice/route.ts`** — GET + PUT now use the bridge in both directions. The legacy `brandVoiceSchema` still validates incoming payloads (Zod cutover is deferred to iter 6 per DECISION 52).
- **`src/app/api/brand-voice/test/route.ts`** — V2 column reads, inline projection back to the legacy `BrandVoiceConfig` shape for `generateReviewResponse` (the prompt builder hasn't been rewritten yet — that's iter 4). Returns the legacy projection for the test panel UI.
- **`src/app/api/reviews/[id]/generate/route.ts` + `regenerate/route.ts`** — each contains an inline projection (V2 row → legacy `BrandVoiceConfig`) so the unchanged `buildSystemPrompt` still has *something* to render between iter 3 and iter 4. Three copies of the same 8-line projection get deleted in iter 4 (DECISION 55).
- **`src/lib/db-utils.ts`** — `getOrCreateBrandVoice` simplified: passes `userId` plus an explicit `tone: "friendly_professional"`; everything else takes the DB-level column defaults.
- **`src/lib/auth.ts` + `src/app/api/auth/signup/route.ts`** — both default-brand-voice writers updated to V2 shape (`tone: "friendly_professional"`, `keyPhrases`, `styleGuidelines: [...]`; remaining columns take DB defaults).
- **`src/lib/ai/claude.ts`** — `BrandVoiceConfig` legacy fields (`formality`, `styleNotes`, legacy string-array `sampleResponses`) marked OPTIONAL (DECISION 53); `buildSystemPrompt` adds inline guards so missing values don't blow up. Iter 4 removes these fields and rewrites the function.
- **`scripts/test-db.ts`** — updated to V2 shape so the helper script keeps working.

**Test coverage delta:**

| Type | Before iter 3 (suite total) | After iter 3 (suite total) | New from this iteration |
|---|---|---|---|
| Unit tests | 871 | 902 | **+31** |
| New unit test files | — | — | 1 (`tests/unit/api/brand-voice/legacy-bridge.test.ts`, 18 cases) |
| Modified unit test files | — | — | 3 (`brand-voice.test.ts`, `db-utils.test.ts`, `signup.test.ts`) |
| New integration test files | — | — | 1 (`tests/integration/brand-voice-schema.test.ts`, 5 scenarios) |
| Modified integration test files | — | — | 2 (`beta-flow.test.ts`, `review-lifecycle.test.ts` — fixture shape) |
| E2E specs | — | — | 0 |

**Verification status:**

- ✅ `npm run lint:strict` clean
- ✅ `npm run type-check` clean
- ✅ `npm run test:unit` 902 passed, 0 failed (62 test files)
- ⏳ Integration tests + migration apply will run in CI's PostgreSQL container
- ⏳ Staging migrate-deploy will execute the TRUNCATE — by design (DECISION 50)

**Decisions** (cross-reference DECISIONS.md "Brand Voice Page Redesign / Iteration 3" subsection): #50 clean-reset migration (TRUNCATE in SQL); #51 legacy form bridge; #52 API field-name cutover iter 3, Zod schema cutover iter 6; #53 legacy `BrandVoiceConfig` fields go OPTIONAL (removed iter 4); #54 CHECK constraints on tone + negative_review_framing; #55 inline V2→legacy projection in generate/regenerate/test routes (deleted iter 4).

### ✅ Iteration 4 — Prompt-building rewrite

**Branch:** `feat/brand-voice-redesign-iter-4`
**Status:** Locally verified (lint:strict / type-check / 963 unit tests passing). PR pending.

**Fixes the headline `styleNotes` JSON-render bug.** Rebuilds `buildSystemPrompt` against the V2 fields. Adds rating-conditional structure templates with the sentiment-overrides-rating routing (the "Kiran case" — 4★ + negative sentiment → mixed/negative template). Injects Personalization toggles (named-staff, occasions) and the negative-review email framing only when relevant. Un-gates the full reinforcement tail (paragraph count + em-dash prohibition + key-phrases precedence + body length + "do NOT generate a salutation or sign-off"). Deletes the three iter-3 inline V2→legacy projections.

After this iteration ships to staging you'll see the AI's output change: multi-paragraph hospitality structure instead of single dense prose, no more em-dashes or banned AI-tell phrases ("delve" / "rest assured" / "we strive to" / "tapestry" / "robust" / "seamless" / "leverage" / "navigate the complexities" / "in the realm of"), no more raw JSON in the prompt (regression-tested), and named-staff + occasion acknowledgement when those toggles are on (which they are by default).

**What shipped:**

- **`src/lib/ai/structure-templates.ts` (NEW, pure module)** — `selectStructureTemplate({rating, sentiment})` + `isNegativeReview` predicate (single source of truth, reused by iter-5 post-processing) + `getStructureTemplate(routing)` returning the positive / mixed / negative template body + `UNIVERSAL_STRUCTURAL_RULES` constant (2–4 paragraph requirement, em-dash prohibition, AI-tell phrase blocklist, Key-phrases precedence rule) + `NAMED_STAFF_FRAGMENT` + `OCCASION_FRAGMENT` + `getFramingFragment(key)` for the three preset framing strings (management_contact, investigation, open_channel — `custom` returns null since the caller handles it specially).
- **`src/lib/ai/claude.ts`** — `buildSystemPrompt` fully rewritten:
  - Drops `formality`, `styleNotes`, legacy string-array `sampleResponses` from `BrandVoiceConfig`. `styleGuidelines` + `sampleResponses` typed as `unknown` (DECISION 57); `normalizeBrandVoice` (iter 2) does the runtime coercion.
  - V2 tone displayed as the human label "Friendly & professional" via `BRAND_VOICE_TONE_INFO_V2[key].label` (DECISION 60).
  - Style guidelines render as a bulleted list, wrapped via `wrapUserContent('Style guidelines', ...)`. **The headline JSON-render bug is fixed.** Regression-tested.
  - Key phrases retain the `MUST` enforcement language (corrected spec §4.3 — keep for Phase 1).
  - Sample responses render as labeled few-shot examples (`for a 5-star review` / `for any review`), each wrapped via `wrapUserContent('Sample response ${i+1}', ...)`.
  - Named-staff fragment injected iff `acknowledgeNamedStaff`; occasion fragment iff `acknowledgeOccasions`.
  - Negative-review email framing fragment injected iff `negativeReviewEmailEnabled && isNegativeReview({rating, sentiment})`. `custom` framing wraps the user-supplied text via `wrapUserContent('Custom framing', ...)`.
  - Universal structural rules + rating-conditional structure template appended.
  - `INSTRUCTION_REINFORCEMENT` (now with the full structural lines un-gated) appended LAST so it has attention precedence over user content.
- **`src/lib/ai/sanitize.ts`** — `INSTRUCTION_REINFORCEMENT` constant un-gated: now includes "approximately 200 words" body length, 2–4 paragraph requirement, em-dash prohibition, "do NOT generate a salutation or sign-off", and the key-phrases precedence rule.
- **`src/lib/ai/claude.ts`** — `BrandVoiceConfig` interface trimmed (legacy fields removed), `GenerateResponseParams` gains `sentiment?: string | null`, `normalizeBrandVoice` runs inside `generateReviewResponse` as a defensive pass, `max_tokens` bumped 500 → 1000 (DECISION 58).
- **`src/app/api/reviews/[id]/generate/route.ts` + `regenerate/route.ts`** — iter-3 inline V2→legacy projection deleted (DECISION 55); routes now pass the V2 brand voice row directly + `review.sentiment` to `generateReviewResponse`. Route-side truncation switched from `RESPONSE_TEXT_MAX` to `RESPONSE_BODY_CHAR_MAX`.
- **`src/app/api/brand-voice/test/route.ts`** — iter-3 inline projection deleted; reuses the legacy bridge's `toLegacyShape` for the test panel response.

**Test coverage delta:**

| Type | Before iter 4 (suite total) | After iter 4 (suite total) | New from this iteration |
|---|---|---|---|
| Unit tests | 902 | 963 | **+61** |
| New unit test files | — | — | 1 (`tests/unit/lib/ai/structure-templates.test.ts`, 26 cases) |
| Modified unit test files | — | — | 1 (`tests/unit/lib/ai/claude.test.ts` — V2 prompt block, +35 cases) |
| Integration tests | — | — | 0 |
| E2E specs | — | — | 0 |

**Verification status:**

- ✅ `npm run lint:strict` clean
- ✅ `npm run type-check` clean
- ✅ `npm run test:unit` 963 passed, 0 failed (63 test files)
- ⏳ Behaviour will be user-verifiable on staging after merge — generate a response and confirm: multi-paragraph structure, no em-dashes, no banned phrases, named-staff/occasion acknowledgement.

**Decisions** (cross-reference DECISIONS.md "Brand Voice Page Redesign / Iteration 4" subsection): #56 structure-template module separate from `claude.ts`; #57 JSONB fields typed as `unknown` with `normalizeBrandVoice` doing coercion; #58 `max_tokens` 500 → 1000; #59 `ToneModifier` type retains legacy 3-key set (iter 6 swaps to V2 4-key set); #60 V2 tone rendered as human display label.

### 🔧 Follow-up fix between iter 4 and iter 5 — E2E mock header-gate

**Branch:** `fix/e2e-mock-header-gate`
**Status:** Locally verified (lint:strict / type-check / 969 unit tests passing). PR pending.

Manual response generation on staging after iter 4 returned the canned Playwright mock string instead of a real Claude response. Root cause: the iter-1 `E2E_MOCK_AI` env-var gate (added April 17, 2026) is single-condition — when set on Vercel Preview, every call to `generateReviewResponse` short-circuits to the canned response regardless of caller. The original assumption that "Preview" and "staging-for-manual-testing" were distinct environments doesn't hold for this project; pushes to `main` build a Preview deployment that serves as the staging URL.

**Fix:** Add a per-request header opt-in. The mock now requires BOTH `E2E_MOCK_AI=true` (env, scopes mocking to Preview) AND `x-e2e-mock: 1` (header, identifies the caller as Playwright). Routes read the header and forward it as a new `e2eMockOptIn` param on `generateReviewResponse`. `playwright.config.ts` adds the header to its `extraHTTPHeaders` so every test carries it. Manual users on the same Preview deployment hit real Claude.

**Files:**
- `src/lib/ai/claude.ts` — `GenerateResponseParams` gains `e2eMockOptIn?: boolean`; guard changes from `if (env === "true")` to `if (env === "true" && e2eMockOptIn)`.
- `src/app/api/reviews/[id]/generate/route.ts` + `regenerate/route.ts` + `src/app/api/brand-voice/test/route.ts` — each reads `request.headers.get("x-e2e-mock") === "1"` and forwards as `e2eMockOptIn`.
- `playwright.config.ts` — `extraHTTPHeaders` restructured so `x-e2e-mock: 1` is always sent and the existing Vercel bypass header remains conditional on the secret.
- `tests/unit/lib/ai/claude.test.ts` — new "E2E mock double-gate" describe block with 6 truth-table cases.

**Test delta:** 963 → 969 unit tests (+6). No integration or E2E changes (E2E already runs against staging with the header now configured).

**Decisions** (cross-reference DECISIONS.md "Follow-up fix: E2E mock header-gate"): #61 mock requires env AND header (follow-up to #15).

---

**Last Updated:** May 21, 2026
**Status:** Brand voice redesign iteration 4 merged via PR #123. E2E mock header-gate fix complete on branch (PR pending). Iter 5 (post-processing) next.

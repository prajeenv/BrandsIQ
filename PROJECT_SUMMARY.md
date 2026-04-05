# BrandsIQ Project Summary

**Last Updated:** January 20, 2026
**Repository:** https://github.com/prajeenv/BrandsIQ
**Current Status:** Prompt 9 Complete - Credit System & Sentiment Standardization

---

## Project Overview

**BrandsIQ** is an AI-powered review response management platform for SMBs. It helps businesses respond to customer reviews across multiple platforms (Google, Amazon, Yelp, etc.) using AI-generated, brand-aligned responses in 40+ languages.

### Core Loop
Reviews added → AI generates response in same language → User edits (optional) → User approves → User publishes

---

## Completed Prompts

### Prompt 0: Planning & Architecture Review ✅
- Validated tech stack and folder structure
- Created implementation plan
- Documented in `docs/phase-0/PROMPT_0_OUTCOME.md`

### Prompt 1: Project Setup & Configuration ✅
- Initialized Next.js 14 with App Router and TypeScript
- Installed core dependencies (NextAuth, Prisma, Anthropic SDK, Resend, shadcn/ui)
- Created folder structure and configuration files
- Documented in `docs/phase-0/PROMPT_1_OUTCOME.md`

### Prompt 2: Database Schema & Prisma Setup ✅
- Implemented complete Prisma schema with 10 models
- Connected to Supabase PostgreSQL
- Created atomic transaction utilities
- **Key Fix:** Downgraded to Prisma 5.22.0 (v7 had breaking changes)
- **Key Fix:** Used direct database URL instead of pooler URL
- Documented in `docs/phase-0/PROMPT_2_OUTCOME.md`

### Prompt 3: Authentication System ✅
- NextAuth.js v5 (beta) with JWT sessions (30 days)
- Email/password authentication with bcrypt (12 rounds)
- Google OAuth provider with account linking
- Email verification flow with Resend
- Password reset flow
- Rate limiting (Upstash Redis with in-memory fallback)
- Protected routes middleware
- Security headers
- Documented in `docs/phase-0/PROMPT_3_OUTCOME.md`

### Prompt 4: Dashboard Layout & Navigation ✅
- Responsive sidebar navigation (Dashboard, Reviews, Settings)
- Dashboard header with user menu dropdown and credit balance badge
- StatsCard and QuotaCard components for metrics display
- EmptyState component for no-data scenarios
- LoadingSpinner and ErrorBoundary shared components
- Dashboard page with real user data, stats, and recent reviews
- `/api/dashboard/stats` endpoint for dashboard data
- Mobile-responsive design with hamburger menu (Sheet component)
- Toast notifications via Sonner

### Prompt 5: Review Management CRUD ✅
- Complete Review API with CRUD operations
- Language detection using `franc-min` library (40+ languages)
- Sentiment analysis using DeepSeek API with fallback
- Review listing with pagination and filters
- Add/Edit/Delete review functionality
- Review detail page with response display
- RTL language support (Arabic, Hebrew, Persian, Urdu)

### Prompt 6: Brand Voice Configuration ✅
- Brand Voice API endpoints (GET, PUT, POST /test)
- Claude AI integration for test response generation
- Settings page with brand voice configuration form
- ToneSelector component (professional/friendly/casual/empathetic)
- FormalitySlider component (1-5 scale)
- KeyPhrasesInput component (tag-style, max 20)
- SampleResponsesInput component (max 5 samples)
- TestResponsePanel for testing brand voice with sample reviews
- Settings overview page with navigation

### Prompt 7: AI Response Generation ✅
- Claude API integration with tone modifiers (professional/friendly/empathetic)
- POST `/api/reviews/[id]/generate` - Initial generation (1.0 credit)
- POST `/api/reviews/[id]/regenerate` - Regenerate with tone (1.0 credit)
- PUT `/api/reviews/[id]/response` - Manual edit (0 credits)
- POST `/api/reviews/[id]/publish` - Mark as approved
- ResponsePanel component for response display and actions
- ResponseEditor component for inline editing with char counter
- ToneModifier dialog for regeneration tone selection
- ResponseVersionHistory with restore capability
- Atomic credit deduction with Prisma transactions
- Version history tracking on every change

---

## Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | Next.js (App Router) | 14.2.35 |
| Language | TypeScript | 5.x (strict mode) |
| Database | PostgreSQL (Supabase) | - |
| ORM | Prisma | 5.22.0 |
| Auth | NextAuth.js | 5.0.0-beta.30 |
| UI | shadcn/ui + Radix UI | - |
| Styling | Tailwind CSS | 3.4 |
| AI | Anthropic Claude SDK | 0.71.2 |
| Sentiment | DeepSeek API | - |
| Language Detection | franc-min | 6.2.0 |
| Email | Resend | 6.7.0 |
| Validation | Zod | 4.3.5 |
| Rate Limiting | Upstash Ratelimit | 2.0.7 |

---

## Project Structure

```
brandsiq/
├── docs/phase-0/           # Specification & outcome docs
│   ├── CORE_SPECS.md       # Product overview, database schema, API contracts
│   ├── SECURITY_AUTH.md    # NextAuth config, security requirements
│   ├── IMPLEMENTATION_GUIDE.md  # User flows, multi-language, edge cases
│   └── PROMPT_*_OUTCOME.md # Completed prompt documentation
├── prisma/
│   └── schema.prisma       # 10 models (User, Review, Response, etc.)
├── src/
│   ├── app/
│   │   ├── (auth)/         # Auth pages (signin, signup, verify-email, etc.)
│   │   ├── (dashboard)/    # Protected dashboard pages
│   │   │   ├── layout.tsx  # Dashboard layout with sidebar & header
│   │   │   └── dashboard/
│   │   │       ├── page.tsx        # Main dashboard page
│   │   │       ├── reviews/        # Review management pages (Prompt 5)
│   │   │       │   ├── page.tsx    # Reviews list with filters
│   │   │       │   ├── new/page.tsx        # Add new review
│   │   │       │   └── [id]/
│   │   │       │       ├── page.tsx        # Review detail with ResponsePanel
│   │   │       │       ├── edit/page.tsx   # Edit review
│   │   │       │       └── generate/page.tsx  # Generate response page (Prompt 7)
│   │   │       └── settings/       # Settings pages (Prompt 6)
│   │   │           ├── page.tsx    # Settings overview
│   │   │           └── brand-voice/page.tsx  # Brand voice config
│   │   └── api/
│   │       ├── auth/       # Auth endpoints
│   │       ├── dashboard/  # Dashboard API
│   │       ├── reviews/    # Review CRUD API (Prompt 5)
│   │       │   ├── route.ts        # POST (create), GET (list)
│   │       │   └── [id]/route.ts   # GET, PUT, DELETE
│   │       └── brand-voice/  # Brand Voice API (Prompt 6)
│   │           ├── route.ts        # GET, PUT
│   │           └── test/route.ts   # POST (test with sample)
│   │       # Response Generation API (Prompt 7) - in reviews/[id]/ folder
│   │       # generate/route.ts, regenerate/route.ts, response/route.ts, publish/route.ts
│   ├── components/
│   │   ├── ui/             # shadcn/ui components (19 components)
│   │   ├── auth/           # LoginForm, SignupForm
│   │   ├── dashboard/      # Dashboard components (Prompt 4)
│   │   ├── reviews/        # Review components (Prompt 5 & 7)
│   │   │   ├── ReviewForm.tsx      # Add/edit review form
│   │   │   ├── ReviewCard.tsx      # Review card display
│   │   │   ├── ReviewList.tsx      # Paginated list with filters
│   │   │   ├── ResponsePanel.tsx   # Response display/actions (Prompt 7)
│   │   │   ├── ResponseEditor.tsx  # Inline response editor (Prompt 7)
│   │   │   ├── ToneModifier.tsx    # Regeneration tone dialog (Prompt 7)
│   │   │   ├── ResponseVersionHistory.tsx  # Version history (Prompt 7)
│   │   │   └── index.ts
│   │   ├── settings/       # Settings components (Prompt 6)
│   │   │   ├── BrandVoiceForm.tsx  # Main brand voice form
│   │   │   ├── ToneSelector.tsx    # Tone picker
│   │   │   ├── FormalitySlider.tsx # Formality slider
│   │   │   ├── KeyPhrasesInput.tsx # Key phrases tags
│   │   │   ├── SampleResponsesInput.tsx  # Sample responses
│   │   │   ├── TestResponsePanel.tsx     # Test panel
│   │   │   └── index.ts
│   │   ├── shared/         # Shared components
│   │   └── providers/      # SessionProvider
│   ├── lib/
│   │   ├── auth.ts         # NextAuth configuration
│   │   ├── prisma.ts       # Prisma client singleton
│   │   ├── db-utils.ts     # Database utilities
│   │   ├── email.ts        # Resend email service
│   │   ├── rate-limit.ts   # Rate limiting
│   │   ├── tokens.ts       # Token generation/validation
│   │   ├── validations.ts  # Zod schemas
│   │   ├── constants.ts    # App constants (tier limits, languages, brand voice, etc.)
│   │   ├── language-detection.ts   # Language detection (franc-min)
│   │   └── ai/
│   │       ├── deepseek.ts # Sentiment analysis service
│   │       └── claude.ts   # Claude AI response generation (Prompt 6)
│   ├── types/
│   │   ├── api.ts          # API types
│   │   ├── database.ts     # Prisma type re-exports
│   │   └── next-auth.d.ts  # NextAuth type extensions
│   └── middleware.ts       # Route protection
├── .env.example            # Environment variables template
└── package.json
```

---

## Database Schema (10 Models)

1. **User** - Authentication, credits, subscription tier
2. **Account** - OAuth accounts (NextAuth)
3. **Session** - User sessions (NextAuth)
4. **VerificationToken** - Email verification & password reset tokens
5. **BrandVoice** - User's brand voice settings
6. **Review** - Customer reviews
7. **ReviewResponse** - AI-generated responses
8. **ResponseVersion** - Version history for responses
9. **CreditUsage** - Audit trail for credit usage
10. **SentimentUsage** - Audit trail for sentiment analysis

---

## Environment Variables Required

```bash
# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres.PROJECT:PASSWORD@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<openssl rand -base64 32>"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Email (Resend)
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@yourdomain.com"

# Rate Limiting (optional - has in-memory fallback)
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."

# AI Services
ANTHROPIC_API_KEY="sk-ant-..."      # REQUIRED for response generation
DEEPSEEK_API_KEY="sk-..."           # For sentiment analysis (optional - has fallback)
```

---

## Key Technical Decisions & Fixes

| Issue | Solution |
|-------|----------|
| Prisma 7.x breaking changes | Downgraded to Prisma 5.22.0 |
| Supabase pooler URL "Tenant not found" | Used direct database URL for migrations, pooler for runtime |
| Password special characters | URL-encoded in connection string |
| Zod v4 enum syntax | Changed `errorMap` to `message` |
| Zod v4 `.errors` → `.issues` | Updated error handling in API routes |
| `@typescript-eslint/no-unused-vars` not found | Removed from ESLint, using standard `no-unused-vars` |
| Tailwind `darkMode: ["class"]` type error | Changed to `darkMode: "class"` |
| `useSearchParams` prerender error | Wrapped pages in Suspense boundaries |
| Type conflict `ReviewResponse` | Renamed API type to `ReviewApiResponse` |
| Google OAuth "email already linked" error | Added `allowDangerousEmailAccountLinking: true` + custom signIn callback |
| OAuth account linking for existing users | Custom signIn callback auto-links Google accounts to existing users |
| Dashboard layout auth state | Changed from server component to client component with `useSession` |
| Tier limits mismatch | Updated constants to match CORE_SPECS.md (FREE: 15 credits, 35 sentiment) |
| Middleware Edge runtime | Changed from `auth()` to `getToken()` for Edge runtime compatibility |
| DeepSeek API unavailable | Added fallback keyword-based sentiment analysis |
| Geist font not loading | Added `transpilePackages: ["geist"]` to next.config.mjs |
| Font CSS variables not applied | Moved font variable classes to `<html>` element in layout.tsx |
| Container not centered | Added container config to tailwind.config.ts |
| reviewDate validation too strict | Changed from `datetime()` to regex that accepts YYYY-MM-DD format |
| ESLint unused vars in type declarations | Prefixed callback params with underscore in interface definitions |
| use(params) runtime error | Replaced with useParams() hook for Next.js 14 compatibility |
| Sentiment credits inconsistency | Standardized from usage model (sentimentUsed + sentimentQuota) to balance model (sentimentCredits) |

---

## Pricing Tiers

| Tier | Price | Credits/Month | Sentiment Quota |
|------|-------|---------------|-----------------|
| FREE | $0 | 15 | 35 |
| STARTER | $29 | 60 | 150 |
| GROWTH | $79 | 200 | 500 |

**Credit Costs:**
- Response generation: 1.0 credits
- Response regeneration: 1.0 credit
- Sentiment analysis: 1 (against sentimentCredits quota)

**Credit Models:**
- Response credits: Balance model (`credits` = remaining)
- Sentiment credits: Balance model (`sentimentCredits` = remaining)

---

## API Endpoints Implemented

### Authentication (Prompt 3)
- `POST /api/auth/signup` - Create account
- `GET /api/auth/verify-email` - Verify email token
- `POST /api/auth/resend-verification` - Resend verification email
- `POST /api/auth/password-reset/request` - Request password reset
- `POST /api/auth/password-reset/confirm` - Reset password with token
- `GET /api/auth/password-reset/confirm` - Validate token
- `GET/POST /api/auth/[...nextauth]` - NextAuth handlers

### Dashboard (Prompt 4)
- `GET /api/dashboard/stats` - Get user stats, credits, sentiment quota, recent reviews

### Reviews (Prompt 5)
- `POST /api/reviews` - Create review (with language detection & sentiment analysis)
- `GET /api/reviews` - List reviews (paginated, filterable by platform/sentiment)
- `GET /api/reviews/[id]` - Get single review with response and versions
- `PUT /api/reviews/[id]` - Update review (re-detects language if text changed)
- `DELETE /api/reviews/[id]` - Delete review (cascades to response/versions)

### Brand Voice (Prompt 6)
- `GET /api/brand-voice` - Get user's brand voice (creates default if none exists)
- `PUT /api/brand-voice` - Update brand voice settings
- `POST /api/brand-voice/test` - Test with sample review (free, no credit deduction)

### Response Generation (Prompt 7)
- `POST /api/reviews/[id]/generate` - Generate AI response (1.0 credit)
- `POST /api/reviews/[id]/regenerate` - Regenerate with tone modifier (1.0 credit)
- `PUT /api/reviews/[id]/response` - Edit response manually (0 credits)
- `POST /api/reviews/[id]/publish` - Mark response as approved

---

## UI Components (shadcn/ui)

**Installed components:**
- button, input, label, card, textarea, badge, select, dialog
- avatar, separator, dropdown-menu, sheet, skeleton, tooltip, scroll-area
- slider (added in Prompt 6)
- alert, alert-dialog, radio-group, collapsible (added in Prompt 7)

---

## Remaining Prompts

| Prompt | Description |
|--------|-------------|
| **10** | Testing & Deployment - E2E testing, multi-language verification, Vercel deployment |

---

## Commands

```bash
# Development
npm run dev           # Start dev server (http://localhost:3000)

# Build
npm run build         # Production build

# Database
npm run db:generate   # Generate Prisma client
npm run db:push       # Push schema to database
npm run db:studio     # Open Prisma Studio

# Testing database connection
npx tsx scripts/test-db.ts
```

---

## Latest Commit

**Commit:** `0d91332`
**Message:** refactor: Standardize sentiment credits to balance model
**Branch:** main

---

## Brand Voice Configuration Features (Prompt 6 Complete)

### Brand Voice API
- **GET /api/brand-voice**: Fetches user's brand voice settings, creates default if none exists
- **PUT /api/brand-voice**: Updates brand voice settings with validation
- **POST /api/brand-voice/test**: Generates a test response using Claude AI (no credit deduction)

### Claude AI Integration
- Created `src/lib/ai/claude.ts` for response generation
- Uses `claude-sonnet-4-20250514` model
- Builds dynamic prompts based on brand voice configuration
- Supports multi-language response generation
- Test mode for previewing brand voice settings

### Brand Voice UI Components
- **ToneSelector**: Visual picker for 4 tone options with icons and descriptions
- **FormalitySlider**: 1-5 scale slider with labeled levels (Very Casual → Very Formal)
- **KeyPhrasesInput**: Tag-style input for key phrases (max 20)
- **SampleResponsesInput**: Textarea list for sample responses (max 5)
- **TestResponsePanel**: Test area with sample reviews and Claude AI integration
- **BrandVoiceForm**: Main form combining all components with save/reset functionality

### Settings Pages
- `/dashboard/settings` - Settings overview with navigation cards
- `/dashboard/settings/brand-voice` - Full brand voice configuration page

### Default Brand Voice
When user signs up or accesses brand voice for first time:
```typescript
{
  tone: "professional",
  formality: 3,
  keyPhrases: ["Thank you", "We appreciate your feedback"],
  styleNotes: "Be genuine and empathetic",
  sampleResponses: []
}
```

---

## AI Response Generation Features (Prompt 7 Complete)

### Response Generation API
- **POST /api/reviews/[id]/generate**: Initial response generation (1.0 credit)
- **POST /api/reviews/[id]/regenerate**: Regenerate with tone modifier (1.0 credit)
- **PUT /api/reviews/[id]/response**: Manual edit (0 credits, marks as edited)
- **POST /api/reviews/[id]/publish**: Mark response as approved

### Tone Modifiers for Regeneration
- `professional` - Business-like, courteous, maintaining formal tone
- `friendly` - Warm, personable, like helping a friend
- `empathetic` - Understanding, compassionate, showing genuine care

### UI Components Created
- **ResponsePanel**: Main response display with all actions (view, edit, regenerate, copy, approve)
- **ResponseEditor**: Inline text editor with character counter (max 500)
- **ToneModifier**: Dialog for selecting regeneration tone with credit cost display
- **ResponseVersionHistory**: Collapsible version list with restore capability

### Version History
- Every change (generate, regenerate, edit, restore) creates a ResponseVersion entry
- Users can view history and restore previous versions
- Restore creates a new version (doesn't overwrite history)

---

## Prompt 8 & 9 Complete

### Prompt 8: Sentiment Analysis
- DeepSeek API integration with keyword-based fallback
- Automatic sentiment on review creation
- Sentiment usage tracking and distribution stats
- Dashboard analytics with distribution chart

### Prompt 9: Credit System
- Credit balance API endpoints
- Usage history page with filters and CSV export
- Low credit warning component
- Monthly reset utility (anniversary-based: 30 days per user)
- Pricing page placeholder

### Post-Prompt 9: Sentiment Credits Standardization (January 20, 2026)
- Changed from usage model (`sentimentUsed` + `sentimentQuota`) to balance model (`sentimentCredits`)
- Now consistent with response credits (`credits` field)
- Single field tracks remaining credits
- API response format unchanged (derives total from tier limits)

---

## Notes for Next Session

1. **Prompt 10** is next: Testing & Deployment
2. **ANTHROPIC_API_KEY is REQUIRED** for response generation (already configured)
3. **DEEPSEEK_API_KEY** is optional (has keyword-based fallback)
4. All environment variables are configured in `.env.local`
5. All features through Prompt 9 are functional and tested
6. Sentiment credits now use balance model (sentimentCredits) like response credits
7. Database migration SQL is in DECISIONS.md for production deployment
8. Current user in database: `prajeen.builder@gmail.com` (has both credentials and Google linked)
9. The Claude service is at `src/lib/ai/claude.ts` with tone modifier support
10. The DeepSeek service is at `src/lib/ai/deepseek.ts` with fallback logic

# BrandsIQ: Claude Code Implementation Prompts
## Complete Development Sequence for MVP Phase 1

**Version:** 2.0 (Regenerated from condensed documentation)  
**Created:** January 2026  
**Purpose:** Step-by-step prompts for Claude Code to implement BrandsIQ MVP  
**Timeline:** 14 days (2 weeks)  
**Tech Stack:** Next.js 14, TypeScript, Prisma, Supabase, NextAuth.js, Tailwind CSS, shadcn/ui

---

## How to Use This Document

1. **Sequential Execution:** Execute prompts in order (Prompt 0 → Prompt 10)
2. **Context Provision:** Before each prompt, provide Claude Code with the 3 condensed documentation files:
   - `docs/phase-0/CORE_SPECS.md` (product, database, API specifications)
   - `docs/phase-0/SECURITY_AUTH.md` (authentication, security, GDPR)
   - `docs/phase-0/IMPLEMENTATION_GUIDE.md` (user flows, multi-language, edge cases)
3. **Verification:** Test each feature after implementation before proceeding
4. **Documentation:** Keep notes on decisions made during implementation

---

## Table of Contents

- [Prompt 0: Planning & Architecture Review](#prompt-0-planning--architecture-review)
- [Prompt 1: Project Setup & Configuration](#prompt-1-project-setup--configuration)
- [Prompt 2: Database Schema & Prisma Setup](#prompt-2-database-schema--prisma-setup)
- [Prompt 3: Authentication System](#prompt-3-authentication-system)
- [Prompt 4: Dashboard & Core UI](#prompt-4-dashboard--core-ui)
- [Prompt 5: Review Management](#prompt-5-review-management)
- [Prompt 6: Brand Voice Configuration](#prompt-6-brand-voice-configuration)
- [Prompt 7: AI Response Generation](#prompt-7-ai-response-generation)
- [Prompt 8: Sentiment Analysis](#prompt-8-sentiment-analysis)
- [Prompt 9: Credit System](#prompt-9-credit-system)
- [Prompt 10: Testing, Deployment & Finalization](#prompt-10-testing-deployment--finalization)

---

# Prompt 0: Planning & Architecture Review

## Context
Review the 3 condensed documentation files to understand the complete project scope.

## Required Files
- `docs/phase-0/CORE_SPECS.md` - Product overview, database schema, API contracts
- `docs/phase-0/SECURITY_AUTH.md` - Authentication setup, security requirements, GDPR compliance
- `docs/phase-0/IMPLEMENTATION_GUIDE.md` - User flows, multi-language support, edge cases

## Prompt

```
I'm building BrandsIQ, an AI-powered review response management platform for SMBs. 
I've completed Phase 0 documentation condensed into 3 files.

Please review all 3 documentation files and create an implementation plan that includes:

1. **Technology Stack Validation**
   - Confirm: Next.js 14 (App Router), TypeScript, Prisma, Supabase PostgreSQL, NextAuth.js
   - Claude AI (claude-sonnet-4-20250514) for response generation
   - DeepSeek API for sentiment analysis
   - Resend for email service
   - Identify any risks or incompatibilities

2. **Project Architecture**
   - Next.js 14 App Router folder structure
   - Component organization strategy
   - API routes structure (/api/reviews, /api/brand-voice, /api/credits)
   - Utility functions organization (lib/)
   - Type definitions organization (types/)

3. **Development Phases**
   - Confirm the 11-prompt sequence is logical
   - Identify critical dependencies (what must be built first)
   - Estimate time for each prompt (2-14 hours per prompt)
   - Total timeline: 14 days

4. **Integration Points**
   - Claude API integration (response generation)
   - DeepSeek API integration (sentiment analysis)
   - Resend email service (verification, password reset)
   - Supabase PostgreSQL database
   - NextAuth.js authentication flow

5. **Critical Success Factors**
   - Credit system must be atomic (no over-deduction)
   - Multi-language support must work natively (not translated)
   - GDPR compliance from day 1
   - Sentiment quota tracking separate from credits

6. **Potential Challenges & Mitigation**
   - List 5-7 likely technical challenges
   - Propose solutions for each

Output:
- Implementation plan (3-5 pages)
- Folder structure tree
- Timeline breakdown
- Risk assessment

This plan will guide all subsequent implementation prompts.
```

**Expected Output:**
- Comprehensive implementation plan
- Project folder structure
- Development timeline
- Risk mitigation strategies

**Time Estimate:** 1-2 hours

---

# Prompt 1: Project Setup & Configuration

## Prerequisites
- Node.js 18+ installed
- Git initialized
- Supabase project created (get DATABASE_URL)
- Claude API key (from Anthropic)
- DeepSeek API key
- Resend API key (for emails)
- Google OAuth credentials (Client ID + Secret)

## Context
Reference: `docs/phase-0/CORE_SPECS.md` (tech stack section)

## Prompt

```
Set up the BrandsIQ project from scratch with all necessary configurations.

**Tasks:**

1. **Initialize Next.js Project**
   ```bash
   npx create-next-app@latest brandsiq \
     --typescript \
     --tailwind \
     --app \
     --src-dir \
     --import-alias "@/*"
   ```

2. **Install Core Dependencies**
   ```bash
   npm install next-auth@beta @prisma/client @anthropic-ai/sdk resend bcryptjs zod react-hook-form date-fns
   npm install -D prisma @types/bcryptjs
   ```

3. **Install UI Dependencies (shadcn/ui)**
   ```bash
   npx shadcn-ui@latest init
   npx shadcn-ui@latest add button input form card dialog select textarea badge table tabs toast avatar
   ```

4. **Install Additional Libraries**
   ```bash
   npm install franc-min axios sonner lucide-react
   ```

5. **Create Environment Variables**
   Create `.env.local`:
   ```env
   # Database
   DATABASE_URL="postgresql://..."
   
   # NextAuth
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="[generate with: openssl rand -base64 32]"
   
   # OAuth
   GOOGLE_CLIENT_ID="..."
   GOOGLE_CLIENT_SECRET="..."
   
   # AI APIs
   ANTHROPIC_API_KEY="sk-ant-..."
   DEEPSEEK_API_KEY="sk-..."
   
   # Email
   RESEND_API_KEY="re_..."
   
   # App
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

6. **Create Folder Structure**
   ```
   brandsiq/
     src/
       app/
         (auth)/
           login/
           signup/
           verify-email/
         (dashboard)/
           dashboard/
           reviews/
           settings/
         api/
           auth/[...nextauth]/
           reviews/
           brand-voice/
           credits/
         layout.tsx
         page.tsx
       components/
         ui/               # shadcn components
         auth/
         dashboard/
         reviews/
       lib/
         prisma.ts
         auth.ts
         claude-api.ts
         deepseek-api.ts
         email.ts
         language-detection.ts
         validations.ts
         utils.ts
       types/
         index.ts
         database.ts
       hooks/
         use-credits.ts
         use-reviews.ts
     prisma/
       schema.prisma
     public/
     .env.local
     .gitignore
     next.config.js
     tailwind.config.js
     tsconfig.json
     package.json
   ```

7. **Configure TypeScript**
   Update `tsconfig.json` with strict mode and path aliases.

8. **Configure Tailwind**
   Add custom colors for BrandsIQ brand (indigo/blue theme).

9. **Create .gitignore**
   Ensure `.env.local`, `node_modules/`, `.next/` are ignored.

10. **Initialize Git**
    ```bash
    git init
    git add .
    git commit -m "Initial project setup"
    ```

**Deliverables:**
- Fully configured Next.js project
- All dependencies installed
- Folder structure created
- Environment variables template
- Working `npm run dev`

**Testing:**
- Run `npm run dev` successfully
- Verify http://localhost:3000 loads
- Check all imports resolve correctly

**Time Estimate:** 2-3 hours
```

---

# Prompt 2: Database Schema & Prisma Setup

## Context
Reference: `docs/phase-0/CORE_SPECS.md` (complete Prisma schema section)

## Prompt

```
Implement the complete database schema using Prisma and connect to Supabase PostgreSQL.

**Tasks:**

1. **Create Prisma Schema**
   Copy the COMPLETE Prisma schema from `docs/phase-0/CORE_SPECS.md` into `prisma/schema.prisma`.
   
   The schema includes:
   - User (with tier, credits, sentimentQuota)
   - Account (OAuth)
   - Session (JWT sessions)
   - VerificationToken (email verification)
   - BrandVoice (user's brand voice settings)
   - Review (customer reviews with language detection)
   - ReviewResponse (AI-generated responses)
   - ResponseVersion (response history)
   - CreditUsage (audit trail for credits)
   - SentimentUsage (audit trail for sentiment analysis)

2. **Configure Prisma Client**
   Create `src/lib/prisma.ts`:
   ```typescript
   import { PrismaClient } from '@prisma/client';
   
   const globalForPrisma = globalThis as unknown as {
     prisma: PrismaClient | undefined;
   };
   
   export const prisma = 
     globalForPrisma.prisma ?? 
     new PrismaClient({
       log: process.env.NODE_ENV === 'development' 
         ? ['query', 'error', 'warn'] 
         : ['error'],
     });
   
   if (process.env.NODE_ENV !== 'production') {
     globalForPrisma.prisma = prisma;
   }
   ```

3. **Create Initial Migration**
   ```bash
   npx prisma migrate dev --name init
   ```

4. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

5. **Create Type Definitions**
   Create `src/types/database.ts`:
   - Export Prisma types for use in components
   - Create custom types for API responses

6. **Create Database Utilities**
   Create `src/lib/db-utils.ts`:
   ```typescript
   // Helper functions for common queries
   - getUserWithCredits(userId)
   - getReviewWithResponse(reviewId)
   - deductCreditsAtomic(userId, amount, action)
   - incrementSentimentUsage(userId)
   ```

7. **Test Database Connection**
   Create a test script to verify:
   - Can connect to Supabase
   - Can create a User record
   - Can query with relations
   - All indexes are applied

**Deliverables:**
- Complete `schema.prisma` file
- Successful migration applied
- Prisma Client generated
- Database utility functions
- Type definitions
- Connection verified

**Testing:**
- Run `npx prisma studio` - verify all tables exist
- Create a test User record
- Query User with nested relations (reviews, brandVoice)
- Check indexes with `EXPLAIN` in Supabase SQL editor

**Time Estimate:** 3-4 hours
```

---

# Prompt 3: Authentication System

## Context
Reference: `docs/phase-0/SECURITY_AUTH.md` (complete NextAuth configuration, security requirements)

## Prompt

```
Implement the complete authentication system using NextAuth.js v5 with email/password and Google OAuth.

**Tasks:**

1. **NextAuth Configuration**
   Create `src/app/api/auth/[...nextauth]/route.ts`
   
   Follow the EXACT configuration from `docs/phase-0/SECURITY_AUTH.md`:
   - Credentials Provider (email/password with bcrypt)
   - Google OAuth Provider
   - JWT session strategy (30 days)
   - Prisma adapter
   - Custom callbacks (signIn, jwt, session)
   - Event handlers (initialize new users with defaults)

2. **Authentication Pages**
   
   **Signup Page:** `src/app/(auth)/signup/page.tsx`
   - Email + password form (min 8 characters)
   - "Continue with Google" button
   - Form validation with Zod
   - Password strength indicator
   - Link to login page
   
   **Login Page:** `src/app/(auth)/login/page.tsx`
   - Email + password form
   - "Continue with Google" button
   - "Remember me" checkbox (30 days)
   - "Forgot password?" link
   - Link to signup page
   
   **Email Verification:** `src/app/(auth)/verify-email/page.tsx`
   - Show verification pending message
   - Resend verification email button
   - Handle verification token from URL

3. **Email Service**
   Create `src/lib/email.ts`:
   ```typescript
   - sendVerificationEmail(email, token)
   - sendPasswordResetEmail(email, token)
   ```
   
   Use Resend API as shown in `docs/phase-0/SECURITY_AUTH.md`.

4. **Protected Routes Middleware**
   Create `middleware.ts`:
   - Protect /dashboard, /reviews, /settings routes
   - Redirect unauthenticated users to /login
   - Allow public routes: /, /login, /signup

5. **Auth Components**
   Create `src/components/auth/`:
   - LoginForm.tsx
   - SignupForm.tsx
   - ProtectedRoute.tsx (wrapper component)

6. **Password Reset Flow**
   - Create password reset request page
   - Create password reset confirmation page
   - Implement token generation and validation
   - Send reset emails via Resend

**Deliverables:**
- Working email/password authentication
- Working Google OAuth
- Email verification flow
- Password reset flow
- Protected routes middleware
- Auth UI components

**Testing:**
- Sign up with email/password → verify email → login
- Sign up with Google → auto-login
- Try accessing /dashboard without auth → redirected to /login
- Test password reset flow
- Test "remember me" (check session duration)

**Time Estimate:** 4-5 hours
```

---

# Prompt 4: Dashboard & Core UI

## Context
Reference: `docs/phase-0/IMPLEMENTATION_GUIDE.md` (dashboard flows, user flows)

## Prompt

```
Build the dashboard layout and core UI components.

**Tasks:**

1. **Dashboard Layout**
   Create `src/app/(dashboard)/layout.tsx`:
   - Responsive sidebar (collapsible on mobile)
   - Navigation: Dashboard, Reviews, Settings
   - User profile dropdown (avatar, name, email, logout)
   - Credit balance display in header
   - Mobile hamburger menu

2. **Dashboard Page**
   Create `src/app/(dashboard)/dashboard/page.tsx`:
   
   Show:
   - Welcome message with user's name
   - Credit balance card (remaining/total, reset date)
   - Sentiment quota card (remaining/total, reset date)
   - Recent reviews (last 5)
   - Quick stats: Total reviews, Total responses, Avg edit rate
   - "Add Review" CTA button

3. **Core Components**
   Create `src/components/dashboard/`:
   
   **DashboardHeader.tsx:**
   - App logo
   - Credit balance badge
   - User menu dropdown
   
   **StatsCard.tsx:**
   - Reusable card for displaying metrics
   - Icon + Label + Value + Trend indicator
   
   **EmptyState.tsx:**
   - Show when no reviews exist
   - "Add your first review" message
   - CTA button

4. **Shared Components**
   Create `src/components/shared/`:
   
   **Navbar.tsx** - Top navigation bar
   **Sidebar.tsx** - Left sidebar with nav links
   **LoadingSpinner.tsx** - Loading indicator
   **ErrorBoundary.tsx** - Error handling wrapper

5. **UI Polish**
   - Consistent color scheme (indigo/blue)
   - Hover states on buttons
   - Active states on nav items
   - Smooth transitions
   - Responsive design (mobile, tablet, desktop)

6. **Toast Notifications**
   Set up Sonner for toast notifications:
   - Success messages (green)
   - Error messages (red)
   - Info messages (blue)

**Deliverables:**
- Working dashboard layout
- Dashboard page with stats
- Core UI components
- Responsive design
- Toast notification system

**Testing:**
- Login → see dashboard with empty state
- Check responsive design on mobile
- Test sidebar collapse/expand
- Test user menu dropdown
- Logout → redirected to login

**Time Estimate:** 4-5 hours
```

---

# Prompt 5: Review Management

## Context
Reference: 
- `docs/phase-0/CORE_SPECS.md` (Review schema, API endpoints, validation rules)
- `docs/phase-0/IMPLEMENTATION_GUIDE.md` (review management flows, edge cases)

## Prompt

```
Implement complete review management functionality (CRUD operations).

**Tasks:**

1. **Review API Endpoints**
   
   **POST /api/reviews** - Create review
   - Validate input (Zod schema from `docs/phase-0/CORE_SPECS.md`)
   - Auto-detect language using `franc-min` library
   - Check sentiment quota availability
   - Run sentiment analysis (DeepSeek API)
   - Save review to database
   - Log sentiment usage
   - Return review with detected language and sentiment
   
   **GET /api/reviews** - List reviews (paginated)
   - Query parameters: page, limit, platform, sentiment
   - Return reviews with responses (if any)
   - Include pagination metadata
   
   **GET /api/reviews/[id]** - Get single review
   - Return review with response and versions
   
   **PUT /api/reviews/[id]** - Update review
   - Allow editing reviewText, rating, platform
   - Re-run language detection if text changed
   
   **DELETE /api/reviews/[id]** - Delete review
   - Cascade delete response and versions
   - Keep audit trails (CreditUsage, SentimentUsage with SET NULL)

2. **Language Detection**
   Create `src/lib/language-detection.ts`:
   
   Use the implementation from `docs/phase-0/IMPLEMENTATION_GUIDE.md`:
   ```typescript
   - detectLanguage(text) → { language, confidence, code }
   - getSupportedLanguages() → string[]
   ```
   
   Support 40+ languages using `franc-min` library.

3. **Review UI Components**
   Create `src/components/reviews/`:
   
   **ReviewForm.tsx:**
   - Platform selector (Google, Amazon, Shopify, etc.)
   - Review text input (1-2000 chars, character counter)
   - Rating selector (1-5 stars, optional)
   - Reviewer name (optional)
   - Auto-detected language display
   - Manual language override dropdown
   - Submit button
   
   **ReviewCard.tsx:**
   - Display review text
   - Show platform, rating, sentiment badge
   - Show detected language
   - Actions: Edit, Delete, Generate Response
   - Show response if exists
   
   **ReviewList.tsx:**
   - List of ReviewCard components
   - Filter by platform, sentiment
   - Sort by date (newest first)
   - Pagination controls

4. **Reviews Page**
   Create `src/app/(dashboard)/reviews/page.tsx`:
   - "Add Review" button
   - ReviewList component
   - Empty state if no reviews
   - Loading states

5. **Review Detail Page**
   Create `src/app/(dashboard)/reviews/[id]/page.tsx`:
   - Full review display
   - Response section (if generated)
   - "Generate Response" button
   - Edit/Delete actions

**Deliverables:**
- Complete review CRUD API
- Language detection working
- Review form with validation
- Review list with filters
- Review detail page

**Testing:**
- Add review in English → verify language detected
- Add review in Spanish → verify language detected
- Add review in Arabic → verify RTL display
- Check character limit enforcement (2000 chars)
- Test pagination
- Test filters (platform, sentiment)
- Delete review → verify cascade

**Time Estimate:** 5-6 hours
```

---

# Prompt 6: Brand Voice Configuration

## Context
Reference: `docs/phase-0/CORE_SPECS.md` (BrandVoice schema, Brand Voice API)

## Prompt

```
Implement brand voice customization system.

**Tasks:**

1. **Brand Voice API Endpoints**
   
   **GET /api/brand-voice** - Get user's brand voice
   - Return current brand voice settings
   - If doesn't exist, create with defaults
   
   **PUT /api/brand-voice** - Update brand voice
   - Validate input (tone, formality, keyPhrases, styleNotes)
   - Update in database
   - Return updated brand voice
   
   **POST /api/brand-voice/test** - Test with sample review
   - Accept sample review text
   - Generate response using brand voice
   - Don't deduct credits (test mode)
   - Return generated response

2. **Brand Voice Settings Page**
   Create `src/app/(dashboard)/settings/brand-voice/page.tsx`:
   
   Form fields:
   - **Tone** selector (professional, friendly, casual, empathetic)
   - **Formality** slider (1-5 scale)
   - **Key Phrases** input (array of strings, max 20)
   - **Style Notes** textarea (free-form guidelines)
   - **Sample Responses** (up to 5 examples)
   
   Features:
   - Save button
   - Reset to defaults button
   - Test with sample review section
   - Preview how responses will sound

3. **Brand Voice Components**
   Create `src/components/settings/`:
   
   **BrandVoiceForm.tsx:**
   - All form fields
   - Validation
   - Save/reset actions
   
   **ToneSelector.tsx:**
   - Visual selector for tone options
   - Show icon + description for each
   
   **FormalitySlider.tsx:**
   - Interactive slider (1-5)
   - Labels: Very Casual → Very Formal
   
   **TestResponsePanel.tsx:**
   - Input sample review
   - Generate test response button
   - Show generated response
   - "Looks good" or "Try again" actions

4. **Default Brand Voice**
   When user signs up, create default brand voice:
   ```typescript
   {
     tone: "professional",
     formality: 3,
     keyPhrases: ["Thank you", "We appreciate your feedback"],
     styleNotes: "Be genuine and empathetic"
   }
   ```

**Deliverables:**
- Brand voice API endpoints
- Brand voice settings page
- Form with all fields
- Test response feature
- Default brand voice on signup

**Testing:**
- Login → check default brand voice exists
- Update tone to "friendly" → save → reload page
- Add key phrases → save → verify persisted
- Test with sample review → verify response matches tone
- Reset to defaults → verify reset works

**Time Estimate:** 3-4 hours
```

---

# Prompt 7: AI Response Generation

## Context
Reference: 
- `docs/phase-0/CORE_SPECS.md` (ReviewResponse schema, Response API, credit costs)
- `docs/phase-0/IMPLEMENTATION_GUIDE.md` (response generation flows, multi-language)

## Prompt

```
Implement AI-powered response generation using Claude API.

**Tasks:**

1. **Claude API Integration**
   Create `src/lib/claude-api.ts`:
   
   ```typescript
   async function generateResponse(
     reviewText: string,
     language: string,
     brandVoice: BrandVoice,
     tone?: string
   ): Promise<string>
   ```
   
   Use the prompt template from `docs/phase-0/IMPLEMENTATION_GUIDE.md`:
   - Instruct Claude to respond in the same language (native quality)
   - Include brand voice guidelines (tone, formality, key phrases)
   - Apply tone modifier if specified (friendly, professional, empathetic)
   - Keep response 50-150 words
   - Use model: claude-sonnet-4-20250514

2. **Response Generation API**
   
   **POST /api/reviews/[id]/generate** - Generate AI response
   - Check user has credits (≥1.0)
   - Fetch review and brand voice
   - Call Claude API to generate response
   - Deduct 1.0 credit (atomic transaction)
   - Save response to ReviewResponse table
   - Create initial ResponseVersion entry
   - Log credit usage (CreditUsage table)
   - Return response with creditsRemaining
   
   **POST /api/reviews/[id]/regenerate** - Regenerate with different tone
   - Check user has credits (≥1.0)
   - Fetch existing response
   - Generate new response with tone modifier
   - Deduct 1.0 credits
   - Update ResponseText
   - Create new ResponseVersion entry
   - Log credit usage
   - Return updated response
   
   **PUT /api/reviews/[id]/response** - Edit response manually
   - Update responseText
   - Set isEdited = true
   - Set editedAt timestamp
   - Create new ResponseVersion entry
   - No credit deduction
   
   **POST /api/reviews/[id]/publish** - Approve response
   - Set isPublished = true
   - Set publishedAt timestamp

3. **Response UI Components**
   Create `src/components/reviews/`:

   **ResponsePanel.tsx:**
   - Show generated response
   - "Edit" button
   - "Regenerate" button with tone selector
   - "Approve" button
   - Loading state during generation
   
   **ResponseEditor.tsx:**
   - Editable textarea for response
   - Character counter (max 500 chars)
   - Save/Cancel buttons
   
   **ResponseVersionHistory.tsx:**
   - List all versions
   - Show which version is current
   - Click to view older version
   
   **ToneModifier.tsx:**
   - Quick tone selector for regeneration
   - Options: More professional, More friendly, More empathetic

4. **Credit Deduction Logic**
   Implement atomic credit deduction in `src/lib/db-utils.ts`:
   ```typescript
   async function deductCreditsAtomic(
     userId: string,
     amount: number,
     action: string,
     reviewId?: string,
     responseId?: string
   )
   ```
   
   Use Prisma transaction with row locking (from `docs/phase-0/SECURITY_AUTH.md`):
   - Lock user row
   - Check credits available
   - Deduct credits
   - Log usage
   - All in single transaction

5. **Multi-Language Response Generation**
   - Detect review language automatically
   - Generate response in SAME language (native quality)
   - Support 40+ languages from `docs/phase-0/IMPLEMENTATION_GUIDE.md`
   - No translation involved - direct generation

**Deliverables:**
- Claude API integration
- Response generation endpoints
- Regeneration with tone modifiers
- Response editing
- Version history
- Atomic credit deduction
- Multi-language support

**Testing:**
- Add English review → generate response → verify English response
- Add Spanish review → generate response → verify Spanish response
- Add Arabic review → verify RTL display of response
- Generate response with 1 credit → check 0 credits remain
- Try generating with 0 credits → verify error message
- Edit response → verify isEdited flag
- Regenerate with "more friendly" → verify tone change
- Check version history → verify all versions saved

**Time Estimate:** 5-6 hours
```

---

# Prompt 8: Sentiment Analysis

## Context
Reference: `docs/phase-0/IMPLEMENTATION_GUIDE.md` (sentiment analysis implementation, DeepSeek integration)

## Prompt

```
Implement sentiment analysis using DeepSeek API.

**Tasks:**

1. **DeepSeek API Integration**
   Create `src/lib/deepseek-api.ts`:
   
   ```typescript
   async function analyzeSentiment(reviewText: string): Promise<{
     sentiment: "positive" | "neutral" | "negative";
     confidence: number;
   }>
   ```
   
   Use the implementation from `docs/phase-0/IMPLEMENTATION_GUIDE.md`:
   - Call DeepSeek Chat API
   - Use low temperature (0.1) for consistency
   - Parse response (positive/neutral/negative)
   - Handle errors gracefully

2. **Integrate with Review Creation**
   Update `POST /api/reviews` endpoint:
   - After language detection, check sentiment quota
   - If quota available:
     * Call analyzeSentiment()
     * Save sentiment to Review.sentiment
     * Log usage in SentimentUsage table
     * Increment user.sentimentUsed
   - If quota exceeded:
     * Skip sentiment analysis
     * Set sentiment to null
     * Show warning to user

3. **Sentiment Quota Tracking**
   - Track usage in user.sentimentUsed
   - Reset monthly on user.sentimentResetDate
   - Display quota in dashboard (e.g., "8/35 used")
   - Show warning when approaching limit (>90%)

4. **Sentiment Display**
   Add sentiment badges to ReviewCard:
   - Positive: Green badge with 😊
   - Neutral: Gray badge with 😐
   - Negative: Red badge with 😞
   - No sentiment: "Analysis unavailable" badge

5. **Sentiment Analytics**
   
   **GET /api/sentiment/usage** - Get sentiment usage history
   - Return list of SentimentUsage records
   - Include: date, sentiment, review preview (100 chars)
   
   Add to dashboard:
   - Sentiment distribution chart (positive/neutral/negative %)
   - Show in StatsCard component

**Deliverables:**
- DeepSeek API integration
- Sentiment analysis on review creation
- Sentiment quota tracking
- Sentiment badges in UI
- Sentiment usage history API
- Dashboard analytics

**Testing:**
- Add positive review → verify "positive" sentiment
- Add negative review (complaints) → verify "negative" sentiment
- Add neutral review → verify "neutral" sentiment
- Use all sentiment quota → try adding review → verify no analysis
- Check dashboard → verify sentiment distribution chart
- Check SentimentUsage table → verify audit trail

**Time Estimate:** 3-4 hours
```

---

# Prompt 9: Credit System

## Context
Reference: 
- `docs/phase-0/CORE_SPECS.md` (credit costs, tier limits, CreditUsage schema)
- `docs/phase-0/SECURITY_AUTH.md` (fraud prevention, atomic transactions)

## Prompt

```
Implement comprehensive credit tracking and management system.

**Tasks:**

1. **Credit Display Components**
   Create `src/components/dashboard/`:
   
   **CreditBalance.tsx:**
   - Show: "12 / 15 credits"
   - Progress bar visualization
   - Reset date: "Resets on Feb 1, 2026"
   - Tier badge: "FREE"
   
   **SentimentQuota.tsx:**
   - Show: "8 / 35 sentiment analyses"
   - Progress bar
   - Reset date
   
   Add to dashboard header and settings page.

2. **Credits API**
   
   **GET /api/credits** - Get credit balance
   Return:
   ```typescript
   {
     credits: {
       remaining: 12,
       total: 15,
       used: 3,
       resetDate: "2026-02-01T00:00:00Z"
     },
     sentiment: {
       remaining: 27,
       total: 35,
       used: 8,
       resetDate: "2026-02-01T00:00:00Z"
     },
     tier: "FREE"
   }
   ```
   
   **GET /api/credits/usage** - Get credit usage history
   Return list of CreditUsage records with:
   - Date, action, credits used, review preview
   - Paginated (20 per page)

3. **Credit Usage History Page**
   Create `src/app/(dashboard)/settings/usage/page.tsx`:
   
   Show table:
   - Date/Time
   - Action (Generate Response, Regenerate)
   - Credits Used (+1.0)
   - Review Preview (first 50 chars)
   - Running balance
   
   Features:
   - Filter by date range
   - Export as CSV
   - Pagination

4. **Low Credit Warnings**
   Add to dashboard:
   - Alert banner when credits < 3
   - "Running low on credits" message
   - CTA: "Upgrade to Starter" (link to pricing page)

5. **Upgrade Flow (Placeholder)**
   Create `src/app/pricing/page.tsx`:
   - Show 3 tiers (FREE, STARTER, GROWTH)
   - Compare features
   - "Current Plan" badge
   - "Upgrade" buttons (disabled for MVP - show "Coming Soon")

6. **Monthly Reset Logic**
   Create a utility function (for future cron job):
   ```typescript
   async function resetMonthlyCredits(): Promise<void>
   ```
   
   Logic:
   - Find users where creditsResetDate < now
   - Reset credits to tier default
   - Reset sentimentUsed to 0
   - Update reset dates to next month
   - Log in system (for audit)

7. **Fraud Prevention**
   Implement race condition prevention:
   - Use Prisma transactions for all credit operations
   - Lock user row during credit deduction
   - Verify credits available before deducting
   - Log all operations in CreditUsage table
   
   See `docs/phase-0/SECURITY_AUTH.md` for implementation details.

**Deliverables:**
- Credit balance display
- Sentiment quota display
- Credits API endpoints
- Credit usage history page
- Low credit warnings
- Pricing page (placeholder)
- Monthly reset utility
- Fraud prevention

**Testing:**
- Check dashboard → verify credit balance accurate
- Generate response → verify credit deducted, balance updated
- Regenerate → verify 1 credit deducted
- View usage history → verify all operations logged
- Test race condition: Multiple rapid API calls → verify no over-deduction
- Check CreditUsage table → verify audit trail complete

**Time Estimate:** 4-5 hours
```

---

# Prompt 10: Testing, Deployment & Finalization

## Context
Reference all 3 documentation files for complete testing scenarios.

## Prompt

```
Finalize the application with comprehensive testing and deployment preparation.

**Tasks:**

1. **End-to-End Testing Scenarios**
   
   **Scenario 1: New User Journey**
   - Sign up with email/password
   - Verify email
   - Login
   - See empty dashboard
   - Add first review (English)
   - Generate response
   - Edit response
   - Approve response
   - Check credits deducted (14/15)
   - Verify usage history
   
   **Scenario 2: Multi-Language**
   - Add Spanish review
   - Verify Spanish response generated
   - Add Arabic review
   - Verify RTL display
   - Verify all sentiment analyses recorded
   
   **Scenario 3: Credit Limits**
   - Use all 15 credits
   - Try generating response → verify error
   - Check "low credits" warning
   - Verify can still add reviews
   
   **Scenario 4: Brand Voice**
   - Update brand voice to "casual"
   - Add formality level 2
   - Add key phrases
   - Generate response → verify tone matches
   
   **Scenario 5: OAuth**
   - Sign up with Google
   - Verify auto-login
   - Verify email pre-verified
   - Verify default credits assigned

2. **Error Handling**
   Test all error scenarios:
   - Invalid credentials → show error
   - Expired verification token → show resend option
   - Insufficient credits → show upgrade prompt
   - API timeout → show retry option
   - Database error → show friendly message
   - Network error → show offline indicator

3. **Performance Testing**
   - Response generation < 5 seconds
   - Dashboard load < 2 seconds
   - Review list pagination smooth
   - No memory leaks (check with React DevTools)

4. **Security Audit**
   Verify (from `docs/phase-0/SECURITY_AUTH.md`):
   - ✅ HTTPS in production
   - ✅ NEXTAUTH_SECRET is strong
   - ✅ Rate limiting on /api/auth endpoints
   - ✅ CSRF protection active
   - ✅ XSS prevention (React escaping)
   - ✅ SQL injection prevented (Prisma)
   - ✅ Password hashing (bcrypt, cost 12)
   - ✅ Email verification required
   - ✅ Session timeout (30 days)

5. **GDPR Compliance**
   Verify (from `docs/phase-0/SECURITY_AUTH.md`):
   - ✅ Data export works (/api/user/data-export)
   - ✅ Account deletion works (/api/user/account)
   - ✅ Audit trails anonymized on deletion
   - ✅ Privacy policy page exists
   - ✅ Cookie consent (if using analytics)

6. **Production Configuration**
   
   Update `next.config.js`:
   ```javascript
   module.exports = {
     // Security headers
     async headers() {
       return [
         {
           source: '/:path*',
           headers: [
             { key: 'X-Frame-Options', value: 'DENY' },
             { key: 'X-Content-Type-Options', value: 'nosniff' },
             { key: 'Referrer-Policy', value: 'origin-when-cross-origin' }
           ]
         }
       ];
     },
     // Environment variables
     env: {
       NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
     }
   };
   ```

7. **Deployment Preparation**
   
   **Environment Variables (Production):**
   - Update all URLs to production domains
   - Rotate NEXTAUTH_SECRET
   - Use production API keys
   - Enable Supabase connection pooling
   
   **Database:**
   - Run final migration
   - Enable Supabase Point-in-Time Recovery
   - Set up daily backups
   
   **Monitoring:**
   - Set up error tracking (Sentry recommended)
   - Set up uptime monitoring
   - Configure log aggregation
   
   **Deploy to Vercel:**
   ```bash
   npm install -g vercel
   vercel --prod
   ```

8. **Documentation**
   Create `README.md`:
   - Project overview
   - Tech stack
   - Environment variables setup
   - Database setup instructions
   - Local development commands
   - Deployment instructions
   - Troubleshooting guide

9. **Beta User Preparation**
   - Create 5 test accounts
   - Give each 50 credits (manually in database)
   - Send invitation emails
   - Prepare feedback form
   - Set up support email

**Deliverables:**
- All testing scenarios passed
- Error handling complete
- Security audit passed
- GDPR compliance verified
- Production configuration ready
- Application deployed
- Documentation complete
- Beta users ready

**Final Checklist:**
- [ ] All 11 prompts completed
- [ ] Authentication works (email + Google)
- [ ] Review CRUD works
- [ ] Response generation works (multi-language)
- [ ] Brand voice customization works
- [ ] Credit system accurate
- [ ] Sentiment analysis works
- [ ] All APIs return correct formats
- [ ] UI responsive (mobile/desktop)
- [ ] Error handling graceful
- [ ] Security measures in place
- [ ] GDPR compliance verified
- [ ] Application deployed
- [ ] 5 beta users onboarded

**Success Criteria:**
- 5 beta users can successfully:
  * Sign up and login
  * Add reviews in different languages
  * Generate AI responses
  * Customize brand voice
  * Use credits without errors
  * No bugs reported in first week

**Time Estimate:** 6-8 hours
```

---

## Development Timeline Summary

| Prompt | Task | Time Estimate | Cumulative |
|--------|------|---------------|------------|
| 0 | Planning & Architecture | 1-2 hours | 2 hours |
| 1 | Project Setup | 2-3 hours | 5 hours |
| 2 | Database Schema | 3-4 hours | 9 hours |
| 3 | Authentication | 4-5 hours | 14 hours |
| 4 | Dashboard & UI | 4-5 hours | 19 hours |
| 5 | Review Management | 5-6 hours | 25 hours |
| 6 | Brand Voice | 3-4 hours | 29 hours |
| 7 | AI Response Generation | 5-6 hours | 35 hours |
| 8 | Sentiment Analysis | 3-4 hours | 39 hours |
| 9 | Credit System | 4-5 hours | 44 hours |
| 10 | Testing & Deployment | 6-8 hours | 52 hours |

**Total:** ~52 hours (~7 working days, 14 calendar days at 4 hours/day)

---

## Critical Path

```
Prompt 1 (Setup)
    |
    v
Prompt 2 (Database)
    |
    v
Prompt 3 (Auth)
    |
    +--------------------+
    |                    |
    v                    v
Prompt 4 (UI)      Prompt 5 (Reviews)
    |                    |
    v                    v
Prompt 6 (Brand)   Prompt 8 (Sentiment)
    |                    |
    +----------+---------+
               |
               v
        Prompt 7 (AI Generation)
               |
               v
        Prompt 9 (Credits)
               |
               v
        Prompt 10 (Testing)
```

**Dependencies:**
- Auth must be done before Dashboard
- Database must be done before everything else
- Reviews must be done before Response Generation
- Brand Voice needed for Response Generation
- Credit System integrates with Response Generation

---

## Success Metrics

**End of Week 2:**
- ✅ 5 beta users onboarded
- ✅ 50+ reviews processed
- ✅ AI responses generated in 3+ languages
- ✅ Zero credit tracking errors
- ✅ <5 second response generation time
- ✅ All acceptance criteria met

---

## Documentation References

Throughout development, refer to:
1. **docs/phase-0/CORE_SPECS.md** - Database schema, API contracts, validation rules
2. **docs/phase-0/SECURITY_AUTH.md** - Authentication setup, security requirements, GDPR
3. **docs/phase-0/IMPLEMENTATION_GUIDE.md** - User flows, multi-language support, edge cases

---

**END OF PROMPTS DOCUMENT**

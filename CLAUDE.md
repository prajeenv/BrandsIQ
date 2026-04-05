# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BrandsIQ is an AI-powered review response management platform for SMBs. It helps businesses respond to customer reviews across multiple platforms (Google, Amazon, Yelp, etc.) using Claude-generated, brand-aligned responses in 40+ languages.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Prisma 5.22, PostgreSQL (Supabase), NextAuth.js v5, shadcn/ui, Claude API, DeepSeek API

## Commands

```bash
npm run dev           # Start development server
npm run build         # Production build
npm run lint          # ESLint
npm run db:generate   # Regenerate Prisma client
npm run db:push       # Push schema changes (dev only)
npm run db:migrate    # Create/run migrations
npm run db:studio     # Open Prisma Studio
npm run db:seed       # Seed database (tsx prisma/seed.ts)
```

## Architecture

### Directory Structure
- `src/app/` - Next.js App Router (pages, API routes, layouts)
- `src/app/(auth)/` - Auth pages (signin, signup, verify-email, password reset)
- `src/app/(dashboard)/` - Protected dashboard routes
- `src/app/api/` - REST API endpoints
- `src/components/` - React components organized by feature (auth/, dashboard/, reviews/, brand-voice/, settings/, shared/, ui/)
- `src/lib/` - Core utilities: auth.ts, prisma.ts, db-utils.ts, validations.ts, constants.ts, ai/
- `src/types/` - TypeScript types and Prisma re-exports
- `prisma/` - Database schema and migrations
- `docs/` - Detailed specs in docs/phase-0/

### Database Models (10 total)
Auth: User, Account, Session, VerificationToken
Core: BrandVoice, Review, ReviewResponse, ResponseVersion
Audit: CreditUsage, SentimentUsage

### API Response Format
All endpoints return:
```typescript
{ success: boolean; data?: T; error?: { code: string; message: string; details?: unknown } }
```
Error codes: UNAUTHORIZED (401), FORBIDDEN (403), NOT_FOUND (404), VALIDATION_ERROR (400), INSUFFICIENT_CREDITS (402), RATE_LIMITED (429)

### Credit System
- Response credits: Balance model (`user.credits` = remaining)
- Sentiment credits: Balance model (`user.sentimentCredits` = remaining)
- Anniversary-based reset: 30 days from signup per user
- Atomic transactions via `deductCreditsAtomic()` in db-utils.ts
- Tier limits in `src/lib/constants.ts` (FREE: 15/35, STARTER: 30/150, GROWTH: 100/500)

### AI Integration
- Claude (`src/lib/ai/claude.ts`): Model `claude-sonnet-4-20250514`, response generation with brand voice
- DeepSeek (`src/lib/ai/deepseek.ts`): Sentiment analysis with keyword-based fallback

## Key Patterns

### Authentication
```typescript
// Server-side
const session = await auth();
const userId = session?.user?.id;

// Client-side
const { data: session } = useSession();
```

### Credit Deduction (Always atomic)
```typescript
const result = await deductCreditsAtomic(userId, 1, "GENERATE_RESPONSE", reviewId);
if (!result.success) return handleError(result.error);
```

### Validation (Zod schemas in validations.ts)
```typescript
const result = createReviewSchema.safeParse(body);
if (!result.success) {
  return NextResponse.json({
    success: false,
    error: { code: "VALIDATION_ERROR", message: result.error.issues[0]?.message }
  }, { status: 400 });
}
```

## Critical Gotchas

| Issue | Solution |
|-------|----------|
| Prisma version | Use 5.22.0 (NOT v7 - breaking changes) |
| Supabase connections | DIRECT_URL for migrations, DATABASE_URL for runtime |
| Zod v4 errors | Use `.issues` not `.errors` |
| NextAuth middleware | Use `auth()` function, not deprecated `withAuth` |
| Credit race conditions | Always use `prisma.$transaction` for credits |
| useSearchParams | Wrap pages in Suspense boundaries |

## Documentation References

### Canonical Specs (Phase 0)
Reference these before making changes to related areas:

@docs/phase-0/CORE_SPECS.md
@docs/phase-0/SECURITY_AUTH.md
@docs/phase-0/IMPLEMENTATION_GUIDE.md

### Tracking Files

@DECISIONS.md
@PROGRESS.md

### Archive (Phase 0 originals — read-only reference)
The 9 original Phase 0 documents are in `docs/archive/phase-0-verbose` (01_ through 09_ prefixed files).
These are archived. The condensed files above are the authoritative source.
Do not reference the archived files unless explicitly asked.

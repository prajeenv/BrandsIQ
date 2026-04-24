# BrandsIQ: Core Specifications (Condensed)
**Version:** 1.0 | **Phase:** MVP | **Timeline:** Weeks 1-2

---

## Product Overview

**BrandsIQ** = AI-powered review response management platform for SMBs. Supports 40+ languages, multiple platforms (Google, Amazon, Shopify, Trustpilot, etc.), generates brand-aligned responses using Claude AI.

**Core Loop:**
Reviews added → AI generates response in same language → User edits (optional) → User approves → User publishes

**Success Metrics:** Responses posted/week, edit rate, time saved, user retention (week 4)

**MVP Scope (Phase 1):**
✅ Auth (email/password, Google OAuth), manual review input, AI response generation, brand voice configuration, credit tracking, sentiment analysis (DeepSeek), multi-language (40+ languages)

❌ NOT Phase 1: CSV import, platform integrations, payment processing, team collaboration, advanced analytics, mobile app

---

## Pricing Tiers

| Tier    | Price     | Credits   | Sentiment Quota |
| ------- | --------- | --------- | --------------- |
| FREE    | $0        | 15/month  | 35/month        |
| STARTER | $29/month | 30/month  | 150/month       |
| GROWTH  | $79/month | 100/month | 500/month       |

**Credit Costs:**
- Response generation: 1.0 credits
- Response regeneration: 1.0 credits
- Sentiment analysis: 1 sentiment credit per analysis (separate balance from response credits; does not consume response credits)

---

## Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// AUTHENTICATION
// ============================================

model User {
  id                  String    @id @default(cuid())
  email               String    @unique
  emailVerified       DateTime?
  name                String?
  image               String?
  password            String?   // bcrypt hashed, null if OAuth only
  
  // Subscription & Credits
  tier                Tier      @default(FREE)
  credits             Int       @default(15)
  creditsResetDate    DateTime  @default(now())
  sentimentCredits    Int       @default(35)   // Balance model: remaining sentiment credits (decremented 1 per analysis)
  sentimentResetDate  DateTime  @default(now())
  
  // Timestamps
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  
  // Relations
  reviews             Review[]
  brandVoice          BrandVoice?
  creditUsage         CreditUsage[]
  sentimentUsage      SentimentUsage[]
  sessions            Session[]
  accounts            Account[]
  
  @@index([email])
  @@index([tier])
  @@map("users")
}

enum Tier {
  FREE
  STARTER
  GROWTH
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String  // "oauth" | "email"
  provider          String  // "google" | "credentials"
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([provider, providerAccountId])
  @@index([userId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  
  @@unique([identifier, token])
  @@map("verification_tokens")
}

// ============================================
// BRAND VOICE
// ============================================

model BrandVoice {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  tone            String   @default("professional")  // "friendly" | "professional" | "casual" | "formal"
  formality       Int      @default(3)               // 1-5 scale
  keyPhrases      String[] @default([])
  styleNotes      String?  @db.Text
  sampleResponses String[] @default([])
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([userId])
  @@map("brand_voices")
}

// ============================================
// REVIEWS & RESPONSES
// ============================================

model Review {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  platform        String                    // "google" | "amazon" | "shopify" | "trustpilot" | "other"
  reviewText      String    @db.Text        // 1-2000 chars
  rating          Int?                      // 1-5 stars, nullable
  reviewerName    String?
  reviewDate      DateTime?
  
  detectedLanguage String   @default("English")
  sentiment       String?                   // "positive" | "neutral" | "negative" | null
  
  externalId      String?
  externalUrl     String?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  response        ReviewResponse?
  creditUsage     CreditUsage[]
  sentimentUsage  SentimentUsage[]
  
  @@index([userId, createdAt])
  @@index([platform])
  @@index([sentiment])
  @@map("reviews")
}

model ReviewResponse {
  id              String   @id @default(cuid())
  reviewId        String   @unique
  review          Review   @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  
  responseText    String   @db.Text        // Max 500 chars
  isEdited        Boolean  @default(false)
  editedAt        DateTime?
  
  creditsUsed     Int      @default(1)
  toneUsed        String   @default("default")
  generationModel String   @default("claude-sonnet-4-20250514")
  
  isPublished     Boolean  @default(false)
  publishedAt     DateTime?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  versions        ResponseVersion[]
  creditUsage     CreditUsage[]
  
  @@index([reviewId])
  @@index([isPublished])
  @@map("review_responses")
}

model ResponseVersion {
  id                String   @id @default(cuid())
  reviewResponseId  String
  reviewResponse    ReviewResponse @relation(fields: [reviewResponseId], references: [id], onDelete: Cascade)
  
  responseText      String   @db.Text
  toneUsed          String
  creditsUsed       Int      @default(1)
  
  createdAt         DateTime @default(now())
  
  @@index([reviewResponseId, createdAt])
  @@map("response_versions")
}

// ============================================
// AUDIT TRAILS
// ============================================

model CreditUsage {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  reviewId          String?
  review            Review?          @relation(fields: [reviewId], references: [id], onDelete: SetNull)
  
  reviewResponseId  String?
  reviewResponse    ReviewResponse?  @relation(fields: [reviewResponseId], references: [id], onDelete: SetNull)
  
  creditsUsed Int      @default(1)          // Negative for refunds
  action      String                        // "GENERATE_RESPONSE" | "REGENERATE" | "REFUND"
  
  // Audit trail survives deletion (SET NULL relationships)
  // Anonymized on GDPR deletion (PII redacted, structure preserved)
  details     String?  @db.Text             // JSON: { reviewSnapshot, responseSnapshot, metadata, anonymized? }
  
  createdAt   DateTime @default(now())
  
  @@index([userId, createdAt])
  @@index([action])
  @@map("credit_usage")
}

model SentimentUsage {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  reviewId  String?
  review    Review?  @relation(fields: [reviewId], references: [id], onDelete: SetNull)
  
  sentiment String   // "positive" | "neutral" | "negative"
  
  // Audit trail survives deletion, anonymized on GDPR deletion
  details   String?  @db.Text  // JSON: { platform, rating, preview (100 chars), analyzedAt, anonymized? }
  
  createdAt DateTime @default(now())
  
  @@index([userId, createdAt])
  @@index([sentiment])
  @@map("sentiment_usage")
}
```

---

## API Endpoints

**Base URL:** `/api/v1`  
**Authentication:** Bearer token (JWT) via NextAuth.js  
**Format:** JSON request/response

### Authentication

```
POST   /auth/signup           → Create account
POST   /auth/login            → Authenticate
POST   /auth/logout           → Invalidate session
POST   /auth/password-reset/request   → Request reset email
POST   /auth/password-reset/confirm   → Reset password with token
GET    /auth/verify-email/:token      → Verify email
```

### User Management

```
GET    /user/profile          → Get current user
PUT    /user/profile          → Update profile
DELETE /user/account          → Delete account (GDPR)
GET    /user/data-export      → Export all data (GDPR)
```

### Reviews

```
POST   /reviews               → Add review
GET    /reviews               → List reviews (paginated)
GET    /reviews/:id           → Get single review
PUT    /reviews/:id           → Update review
DELETE /reviews/:id           → Delete review
```

### Response Generation

```
POST   /reviews/:id/generate  → Generate AI response
POST   /reviews/:id/regenerate → Regenerate with different tone
PUT    /reviews/:id/response  → Edit response
POST   /reviews/:id/publish   → Approve/publish response
GET    /reviews/:id/versions  → Get version history
```

### Brand Voice

```
GET    /brand-voice           → Get current brand voice
PUT    /brand-voice           → Update brand voice
POST   /brand-voice/test      → Test with sample review
```

### Credits & Analytics

```
GET    /credits               → Get credit balance
GET    /credits/usage         → Get usage history
GET    /sentiment/usage       → Get sentiment quota usage
```

### Cron Jobs

```
GET    /cron/reset-credits    → Reset credits for users (secured with CRON_SECRET)
```

---

## API Request/Response Formats

### POST /reviews
```typescript
// Request
{
  "platform": "google",        // Required: "google" | "amazon" | "shopify" | "trustpilot" | "other"
  "reviewText": string,        // Required, 1-2000 chars
  "rating"?: number,           // Optional, 1-5
  "reviewerName"?: string,
  "reviewDate"?: string,       // ISO 8601
  "externalId"?: string,
  "externalUrl"?: string
}

// Response 201
{
  "success": true,
  "data": {
    "review": {
      "id": "review_abc123",
      "platform": "google",
      "reviewText": "Great service!",
      "rating": 5,
      "detectedLanguage": "English",
      "sentiment": "positive",
      "createdAt": "2026-01-08T10:30:00Z"
    }
  }
}
```

### POST /reviews/:id/generate
```typescript
// Request
{
  "tone"?: "professional" | "friendly" | "empathetic" | "default"
}

// Response 200
{
  "success": true,
  "data": {
    "response": {
      "id": "response_xyz789",
      "reviewId": "review_abc123",
      "responseText": "Thank you for your wonderful feedback!...",
      "creditsUsed": 1,
      "toneUsed": "professional",
      "generationModel": "claude-sonnet-4-20250514",
      "createdAt": "2026-01-08T10:31:00Z"
    },
    "creditsRemaining": 14
  }
}

// Error 402 - Insufficient credits
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "You have 0 credits remaining",
    "details": {
      "creditsNeeded": 1,
      "creditsAvailable": 0,
      "resetDate": "2026-02-01T00:00:00Z"
    }
  }
}
```

### GET /credits
```typescript
// Response 200
{
  "success": true,
  "data": {
    "credits": {
      "remaining": 12,
      "total": 15,
      "used": 3,
      "resetDate": "2026-02-01T00:00:00Z"
    },
    "sentiment": {
      "remaining": 27,
      "total": 35,
      "used": 8,
      "resetDate": "2026-02-01T00:00:00Z"
    },
    "tier": "FREE"
  }
}
```

---

## Error Response Format

```typescript
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",               // Machine-readable
    "message": "Human-readable message",
    "details"?: { ... }                 // Optional additional context
  }
}
```

**Common Error Codes:**
- `UNAUTHORIZED` (401): Invalid/missing token
- `FORBIDDEN` (403): Valid token, insufficient permissions
- `NOT_FOUND` (404): Resource doesn't exist
- `VALIDATION_ERROR` (400): Invalid input
- `INSUFFICIENT_CREDITS` (402): Not enough credits
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error

---

## Validation Rules

### User
- Email: valid format, unique
- Password: min 8 chars (email/password auth)
- Credits: 0-1000 (cannot go negative)

### Review
- reviewText: 1-2000 chars
- rating: 1-5 or null
- platform: one of allowed values
- detectedLanguage: auto-detected, user can override

### ReviewResponse
- responseText: 1-500 chars
- creditsUsed: positive integer
- isPublished: boolean

### BrandVoice
- tone: "friendly" | "professional" | "casual" | "formal"
- formality: 1-5 integer
- keyPhrases: array of strings, max 20 items
- sampleResponses: array of strings, max 5 items

---

## Constants

```typescript
// Tier limits
const TIER_LIMITS = {
  FREE: { credits: 15, sentiment: 35 },
  STARTER: { credits: 30, sentiment: 150 },
  GROWTH: { credits: 100, sentiment: 500 }
};

// Credit costs
const CREDIT_COSTS = {
  GENERATE_RESPONSE: 1.0,
  REGENERATE_RESPONSE: 1.0,
};
// Sentiment analysis is NOT in CREDIT_COSTS — it consumes 1 sentimentCredit
// from a separate balance (see TIER_LIMITS.*.sentiment).

// Supported platforms
const PLATFORMS = [
  "google",
  "amazon",
  "shopify",
  "trustpilot",
  "facebook",
  "yelp",
  "other"
];

// Sentiments
const SENTIMENTS = ["positive", "neutral", "negative"];
```

---

## UI Patterns

### Credit Warning Banner

The dashboard displays a unified warning banner when either response credits or sentiment credits are low (≤20% remaining) or exhausted (0).

**Threshold Logic:**
- **Low:** ≤20% remaining (matches graph yellow threshold at 80% used)
- **Out:** 0 remaining

This percentage-based threshold ensures all tiers get proportional warning time:
- FREE (15 credits): Warning at ≤3 credits
- STARTER (30 credits): Warning at ≤6 credits
- GROWTH (100 credits): Warning at ≤20 credits

**Priority Matrix:**
| Response Credits | Sentiment Credits | Banner Color | Title |
|------------------|-------------------|--------------|-------|
| OK (>20%) | OK (>20%) | None | No banner shown |
| OK | Low (≤20%) | Yellow | "Running Low on Sentiment Credits" |
| Low (≤20%) | OK | Yellow | "Running Low on Response Credits" |
| OK | 0 | Yellow | "Out of Sentiment Credits" |
| Low (≤20%) | Low (≤20%) | Yellow | "Running Low on Credits" |
| 0 | OK | Red | "Out of Response Credits" |
| Low (≤20%) | 0 | Red | "Out of Sentiment Credits" |
| 0 | Low (≤20%) | Red | "Out of Response Credits" |
| 0 | 0 | Red | "Out of Credits" |

**Color Logic:**
- **Red (Critical):** Response credits = 0 (blocks core response generation)
- **Yellow (Warning):** All other low/exhausted states

**Component:** `LowCreditWarning` in `src/components/dashboard/`

**Behavior:**
- Single unified banner (no stacking)
- Dismissible (state resets on page reload)
- Shows earlier reset date when both credit types have issues
- "Upgrade Plan" CTA links to /pricing

### Sentiment Skipped Indicator

When sentiment analysis is skipped (no credits), reviews display a visual indicator instead of hiding the sentiment badge.

**Display States:**
| State | Display |
|-------|---------|
| Has sentiment | Colored badge: `[positive]` / `[negative]` / `[neutral]` |
| No sentiment | Muted text + icon: `Sentiment ⚠` with tooltip |

**Tooltip:** "Sentiment analysis skipped - no credits"

**Alert Banner (on add review):**
- When adding a review with no sentiment credits, redirect includes `?sentimentSkipped=true`
- Review detail page shows dismissible yellow alert: "Sentiment Analysis Skipped"
- Includes "Upgrade for more credits" link

**Components:**
- `ReviewCard.tsx` - Shows indicator in review list
- `reviews/[id]/page.tsx` - Shows indicator + alert banner

---

## Cron Jobs

### Credit Reset (`/api/cron/reset-credits`)

Resets credits for all users whose reset date has passed. Uses anniversary-based billing (each user's cycle is 30 days from their signup/last reset).

**Schedule:** Daily at midnight UTC (`0 0 * * *`)

**What it does:**
1. Finds all users where `creditsResetDate < now`
2. For each user:
   - Resets `credits` to tier limit (FREE: 15, STARTER: 60, GROWTH: 200)
   - Resets `sentimentCredits` to tier limit (FREE: 35, STARTER: 150, GROWTH: 500)
   - Updates `creditsResetDate` and `sentimentResetDate` to 30 days forward
   - Creates audit log in `CreditUsage` table with action `MONTHLY_RESET`

**Security:** Requires `CRON_SECRET` environment variable. Vercel sends this automatically when calling scheduled endpoints.

**Configuration:**
- Endpoint: `src/app/api/cron/reset-credits/route.ts`
- Vercel config: `vercel.json`

**Testing locally:**
```bash
# No CRON_SECRET set (development mode)
curl http://localhost:3000/api/cron/reset-credits

# With CRON_SECRET set
curl http://localhost:3000/api/cron/reset-credits \
  -H "Authorization: Bearer your-secret"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "usersReset": 5,
    "errors": [],
    "details": [
      {
        "userId": "user_123",
        "tier": "FREE",
        "creditsReset": 15,
        "sentimentReset": 35
      }
    ],
    "timestamp": "2026-02-01T00:00:00.000Z"
  }
}
```

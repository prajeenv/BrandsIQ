# Documentation Roadmap: AI Review Management Platform

**Version:** 1.0  
**Last Updated:** January 2025  
**Product:** BrandsIQ (AI Review Management Platform)

---

## Core Principle

**"Docs follow risk, not ideas."**

- Write only what reduces immediate risk
- Documents evolve with the product
- Do NOT write everything upfront
- Each phase unlocks the next set of docs

---

## Table of Contents

1. [Phase 0: Before Any Code (Week 0)](#phase-0-before-any-code-week-0)
2. [Phase 1: During Vibe Coding (Weeks 1-2)](#phase-1-during-vibe-coding-weeks-1-2)
3. [Phase 2: After MVP Ships (End of Week 2)](#phase-2-after-mvp-ships-end-of-week-2)
4. [Phase 3: After CSV Works (Week 3)](#phase-3-after-csv-works-week-3)
5. [Phase 4: After Google Integration (Week 4)](#phase-4-after-google-integration-week-4)
6. [Phase 5: Shopify Integration (Month 2)](#phase-5-shopify-integration-month-2)
7. [Phase 6: Platform Maturity (Month 3+)](#phase-6-platform-maturity-month-3)

---

# PHASE 0: BEFORE ANY CODE (Week 0)

**Timeline:** 3-5 days  
**Purpose:** Foundation documents that define scope and enable vibe coding

## Documents to Create (9 total)

---

## 1. PRODUCT_ONE_PAGER.md

**Purpose:** Single source of truth. Prevents scope creep.

**Page Limit:** 1 page max

### Contents:

```markdown
# BrandsIQ: AI Review Management Platform

## Who Uses It
- Local businesses (restaurants, retail, services) managing Google/Yelp reviews
- E-commerce brands managing Shopify/Amazon/Trustpilot reviews  
- Multi-location businesses managing reviews across 10-100+ locations
- Service providers managing client feedback

Target: SMBs with 50-2,000 reviews/month, currently spending 5-20 hours/week on manual responses.

## Core Loop
1. Reviews arrive (manual paste, CSV upload, or API sync)
2. AI generates brand-aligned response in review's language
3. User edits (optional) and approves
4. User posts to platform (manual copy-paste or API)

Time: 100 reviews → 30 minutes instead of 5 hours

## Differentiation
1. **Brand Voice Memory**: Learns from every edit, gets smarter over time
2. **Multi-Language Native**: Responds in 20+ languages automatically
3. **Bulk Workflows**: Process 100+ reviews at once
4. **Platform Agnostic**: Works with ANY review platform via CSV
5. **AI-First**: Built for AI from day 1, not bolted on

## Success Metrics
Primary: Responses posted per workspace per week
Secondary: 
- Edit rate (lower = AI learning)
- Time saved per user per week
- Response time (review received → posted)
- User retention (week 4 active users)

## Non-Goals (MVP)
- Review collection/solicitation
- Review widgets
- Advanced analytics
- Team collaboration
- White labeling
- Mobile app
```

---

## 2. PRD_MVP_PHASE1.md

**Purpose:** Define ruthlessly minimal scope for weeks 1-2.

**Page Limit:** 2-3 pages max

### Contents:

```markdown
# PRD: MVP Phase 1 (Weeks 1-2)

## Scope
Build ONLY the core response generation loop. Prove AI quality.

## Features IN SCOPE

### F1: Manual Review Input
- User pastes review text into form
- Select platform (dropdown: Google, Shopify, Amazon, Other)
- Select rating (1-5 stars)
- Optional: reviewer name, date
- Save to database
- Validation: Review text required (10-2000 chars)

### F2: AI Response Generation
- Click "Generate Response" on any review
- System detects language automatically (20+ languages)
- AI generates response in same language
- Uses brand voice profile
- Shows response in <5 seconds
- Display: generated text, language detected, tokens used, cost
- Store: generated text, metadata, timestamps

### F3: Brand Voice Learning
- One-time setup form:
  - Brand name (required)
  - Industry dropdown (10 options)
  - Tone slider: Formal ←→ Casual
  - Personality: Professional / Friendly / Playful / Luxury
  - Do's list (0-5 items): "Always mention free shipping"
  - Don'ts list (0-5 items): "Never use exclamation marks"
- Save to database
- Load on every AI generation
- Update when user edits AI response

### F4: Response Editor
- Edit AI-generated text
- Character counter
- Copy to clipboard button
- Save as draft
- Mark as approved
- Track: was_edited (boolean)

### F5: Multi-Language Support (Automatic)
- Detect review language on input
- Generate response in same language
- Support: EN, DE, FR, ES, IT, PT, NL, PL, JA, ZH, AR, RU, KO, SV, DA, FI, NO, TR, HI, BN
- Display language flag in UI
- Optional: Override language (dropdown)

### F6: Usage Tracking
- Track per user:
  - Reviews processed this month
  - Responses generated
  - API cost (cents)
  - Tokens used
- Display in dashboard
- Enforce free tier limit (50 reviews/month)

## Features EXPLICITLY OUT OF SCOPE
❌ CSV import (Phase 2)
❌ API integrations (Phase 3+)
❌ Email forwarding (Phase 3+)
❌ Bulk actions (Phase 2)
❌ Analytics dashboard (Phase 3)
❌ Team features (Phase 4+)
❌ Review collection (Phase 5+)
❌ Stripe billing (Phase 2)

## Success Criteria
- User can paste 10 reviews, generate responses, edit, export in <15 minutes
- AI responses rated 4+ stars by users (user feedback prompt)
- Edit rate <30% (means AI is good enough)
- Zero data loss
- Zero credential leaks
- GDPR compliant

## Non-Goals
- Perfect UI polish (functional > beautiful)
- Advanced error recovery (basic errors OK)
- Performance optimization (works for 1 user)
- SEO (no public pages yet)

## Technical Constraints
- Max 200 tokens per AI response (cost control)
- 5 second timeout on AI calls
- Manual review input only (no integrations)
- Single workspace per user (multi-workspace in Phase 4)

## Risks
1. AI quality varies by language → Test 5+ languages before launch
2. Cost per review too high → Monitor actual costs daily
3. Brand voice learning doesn't work → Start with simple examples
4. Users want CSV immediately → Add to Phase 2 roadmap

## Launch Checklist
- [ ] Core loop works end-to-end
- [ ] Privacy policy published
- [ ] Terms published
- [ ] Cookie consent banner
- [ ] GDPR: Data export works
- [ ] GDPR: Account deletion works
- [ ] Free tier limits enforced
- [ ] Error states handled
- [ ] 5 beta users test successfully
```

---

## 3. USER_FLOWS_CORE.md

**Purpose:** Define critical paths and failure modes.

**Page Limit:** 3-4 pages

### Structure:

```markdown
# Core User Flows

## Flow 1: Signup → First Response

### Happy Path
1. User lands on homepage
2. Click "Start Free Trial"
3. Clerk signup: email + password OR Google OAuth
4. Email verification (if email/password)
5. Redirect to /onboarding
6. [... detailed 20-step flow ...]

**Time:** 5 minutes from landing to first response

### Failure Paths

**F1.1: Invalid Email**
- User enters "notanemail"
- Clerk shows: "Please enter a valid email"
- User corrects, continues

**F1.2: Email Already Exists**
[...]

**F1.3: Empty Review Text**
[...]

**F1.4: AI API Failure**
[...]

**F1.5: Network Error During Save**
[...]

## Flow 2: Generate Response for Negative Review
[...]

## Flow 3: Edit Brand Voice Settings
[...]

## Flow 4: Export Responses (Manual Posting)
[...]

## Flow 5: Hit Free Tier Limit
[...]

## Edge Cases

### E1: Very Long Review (>2000 chars)
[...]

### E2: Non-Latin Characters
[...]

### E3: Review in Mixed Languages
[...]

### E4: Spam Review
[...]

### E5: Same Review Pasted Twice
[...]
```

**Key Sections:**
- Happy paths for 5 critical flows
- Failure paths for each flow
- Edge cases (5-10 scenarios)
- Time estimates for each flow

---

## 4. DATA_MODEL.md

**Purpose:** Schema is foundational. Get this right early.

**Page Limit:** 4-5 pages

### Contents:

```markdown
# Data Model

## Core Principles
1. Multi-tenant from day 1 (tenant_id = userId for MVP)
2. Soft deletes everywhere (deletedAt)
3. Timestamps on everything (createdAt, updatedAt)
4. Audit fields for compliance (createdBy, updatedBy)
5. Immutable history (never update responses, create new versions)

## Entities

### User
```prisma
model User {
  id            String   @id @default(cuid())
  clerkId       String   @unique
  email         String   @unique
  name          String?
  
  // Subscription
  plan          Plan     @default(FREE)
  planStatus    PlanStatus @default(ACTIVE)
  stripeCustomerId String? @unique
  subscriptionId   String? @unique
  
  // GDPR Compliance
  consentGiven     Boolean  @default(false)
  consentDate      DateTime?
  dataRetentionDays Int     @default(90)
  deletedAt        DateTime?
  
  // Security
  lastLoginAt   DateTime?
  lastLoginIp   String?
  failedLoginAttempts Int @default(0)
  
  // Timestamps
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  brandProfile  BrandProfile?
  reviews       Review[]
  responses     Response[]
  integrations  Integration[]
  usage         Usage[]
  auditLogs     AuditLog[]
  
  @@index([email])
  @@index([clerkId])
}

enum Plan {
  FREE      // 50 reviews/month
  STARTER   // 500 reviews/month - $29
  GROWTH    // 2000 reviews/month - $99
  ENTERPRISE // Unlimited - $299
}

enum PlanStatus {
  ACTIVE
  CANCELLED
  PAST_DUE
  PAUSED
}
```

### BrandProfile
[Full Prisma schema with comments]

### Review
[Full Prisma schema with comments]

### Response
[Full Prisma schema with comments]

### Integration (Phase 3+, schema ready now)
[Full Prisma schema with comments]

### Usage
[Full Prisma schema with comments]

### AuditLog
[Full Prisma schema with comments]

## Soft Delete Pattern
[Code examples]

## Data Retention Rules
[Table with retention by entity and plan]

## Tenant Isolation
[Code examples of correct vs incorrect queries]

## Migration Strategy
[Phase-by-phase approach]
```

**Include:**
- Complete Prisma schemas for all entities
- All enums defined
- Relationships clearly marked
- Indexes specified
- Soft delete patterns
- Data retention rules
- Tenant isolation examples

---

## 5. API_CONTRACTS_INTERNAL.md

**Purpose:** Define internal APIs before implementing.

**Page Limit:** 5-6 pages

### Structure:

```markdown
# Internal API Contracts

## Design Principles
1. RESTful where possible
2. Type-safe (TypeScript interfaces)
3. Error codes standardized
4. Rate limiting built-in
5. Idempotent where possible

## Authentication
[Clerk auth pattern for all endpoints]

## 1. Generate AI Response

**Endpoint:** `POST /api/reviews/generate`

**Request:**
```typescript
interface GenerateRequest {
  reviewId: string;
  regenerate?: boolean;
  customInstructions?: string;
  responseLanguage?: string;
}
```

**Response:**
```typescript
interface GenerateResponse {
  success: boolean;
  data?: {
    responseId: string;
    responseText: string;
    language: string;
    tokensUsed: number;
    costCents: number;
    generationTimeMs: number;
  };
  error?: {
    code: string;
    message: string;
  };
}
```

**Error Codes:**
- `REVIEW_NOT_FOUND`
- `ALREADY_HAS_RESPONSE`
- `AI_SERVICE_ERROR`
- `AI_TIMEOUT`
- `QUOTA_EXCEEDED`
- `INVALID_LANGUAGE`

**Business Logic:**
[10-step detailed flow]

**Rate Limit:** 10 requests per minute per user

## 2. Save/Update Response
[...]

## 3. Update Brand Voice
[...]

## 4. List Reviews
[...]

## 5. Create Review (Manual Input)
[...]

## 6. Get Usage Stats
[...]

## Error Response Format (Standardized)
[...]

## Rate Limiting Strategy
[Code examples with Upstash]

## Future APIs (Phase 2+)
[List endpoints not in MVP but planned]
```

**Include:**
- 6 core API endpoints fully specified
- TypeScript interfaces for all requests/responses
- Error codes enumerated
- Business logic steps
- Rate limiting rules
- Future API list (don't design yet)

---

## 6. ARCHITECTURE_DEPLOYMENT.md

**Purpose:** High-level architecture reference.

**Page Limit:** 6-7 pages

### Contents:

```markdown
# Architecture & Deployment

## System Architecture

[ASCII diagram of system components]

## Tech Stack

### Frontend
- Framework: Next.js 14 (App Router)
- Language: TypeScript 5.3+
- Styling: Tailwind CSS + shadcn/ui
- Forms: React Hook Form + Zod
- State: React Query
- Icons: Lucide React

### Backend
- Runtime: Node.js 20 (Vercel Edge Functions)
- API: Next.js API Routes
- Type Safety: TypeScript + Zod schemas

### Database
- Primary: Supabase (PostgreSQL 15)
- ORM: Prisma 5.x
- Migrations: Prisma Migrate
- Caching: Upstash Redis

### Authentication
- Provider: Clerk
- Method: Email/Password + Google OAuth
- Session: JWT tokens (Clerk managed)

### AI
- Provider: Anthropic Claude
- Model: claude-sonnet-4-20250514
- Caching: Prompt caching for brand voice

### Payments (Phase 2)
- Provider: Stripe
- Integration: Checkout + Customer Portal

### File Storage (Phase 2)
- Provider: Supabase Storage
- Use: CSV uploads

### Email (Phase 2)
- Provider: Resend
- Use: Transactional emails

### Monitoring
- Errors: Sentry
- Analytics: PostHog
- Logs: Vercel Logs

### Deployment
- Platform: Vercel
- Regions: Auto (Edge Network)
- CDN: Vercel Edge

## Data Flow: Generate Response

[Detailed 13-step flow diagram]

## Async Jobs (Phase 2)

[Vercel Cron architecture]

## Security Architecture

### Authentication Flow
[Flow diagram]

### Data Encryption

**In Transit:**
- HTTPS everywhere (TLS 1.3)

**At Rest:**
- Supabase AES-256
- OAuth tokens AES-256-GCM
[Code examples for encryption/decryption]

### Tenant Isolation
[Code examples]

### Rate Limiting
[Code examples with Upstash]

## Environment Variables

```bash
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# AI
ANTHROPIC_API_KEY="sk-ant-..."

# Encryption
ENCRYPTION_KEY="..." # 32 bytes hex

# Redis
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

[... full list]
```

## Deployment Strategy

### Phase 1: MVP
[5-step process]

### Phase 2: Staging + Production
[Branch strategy, testing, migrations]

### Database Migrations
[Commands and process]

### Rollback Strategy
[3-step recovery plan]

## Monitoring & Alerts

### Error Tracking (Sentry)
[Code examples]

### Performance Monitoring
[Tools list]

### Alerts
[Alert conditions]

## Scaling Considerations

### Current Limits (MVP)
[Capacity numbers]

### Phase 2 Scaling Needs
[Projected capacity]

**Bottlenecks:**
[4 identified bottlenecks + solutions]

### Cost Optimization
[Cost breakdown and margin calculation]

## Diagrams

### System Context Diagram
[Simple architecture diagram]

### Database ER Diagram
[Entity relationship diagram]
```

**Include:**
- Complete tech stack with versions
- System architecture diagram
- Data flow for core feature
- Security architecture
- Environment variables list
- Deployment process
- Monitoring strategy
- Scaling plan
- Keep diagrams simple (ASCII or Mermaid)

---

## 7. SECURITY_PRIVACY_BRIEF.md

**Purpose:** Dedicated security doc. Non-negotiable for launch.

**Page Limit:** 8-10 pages (longer because critical)

### Contents:

```markdown
# Security & Privacy Brief

**Critical:** This product handles customer reviews (personal data). GDPR compliance is mandatory.

## 1. Authentication Model

### Provider: Clerk

**Why Clerk:**
[5 reasons]

### Authentication Flow
[Step-by-step flow]

### Password Policy
[Requirements]

### OAuth Providers
[List + future plans]

## 2. Workspace Isolation

### Tenant Model
[MVP vs Phase 4 approach]

### Data Isolation Rules
[Code examples - MANDATORY patterns]

### Database Row-Level Security (Future)
[SQL examples for Phase 3]

## 3. Data Classification

| Data Type | Sensitivity | Encryption | Retention | GDPR |
|-----------|-------------|------------|-----------|------|
| User email | High | At rest | Until deletion | Yes |
| Review text | Medium | At rest | 90 days (free) | Yes |
| Reviewer names | Medium | At rest | Same as review | Yes |
| OAuth tokens | High | At rest + transit, AES-256 | Until disconnected | No |
[... complete table]

## 4. GDPR Compliance

### Legal Basis
[Explanation]

### User Rights

#### Right to Access
[Implementation with code]

#### Right to Deletion
[Implementation with code]

#### Right to Rectification
[How users can edit data]

#### Right to Data Portability
[Export format]

#### Right to Restrict Processing
[Implementation]

### Consent Management

**Cookie Consent Banner:**
[Code implementation]

**Cookies Used:**
[Complete list with purposes]

### Data Retention Policy

[Code implementation for automated enforcement]

### Data Processing Agreement (DPA)

**Sub-processors:**
- Anthropic (AI processing)
- Supabase (database)
- Clerk (authentication)
- Vercel (hosting)
- Upstash (caching)

[Disclosure language for privacy policy]

## 5. Third-Party Data Sharing Rules

### What We Share
[Complete list by processor]

### What We NEVER Share
[Complete list]

### User Control
[Settings UI mockup]

## 6. Encryption

### At Rest
[Technologies used]

### In Transit
[Technologies used]

### Application-Level Encryption
[Complete encryption/decryption code]

## 7. Security Checklist (Before Launch)

### Must Have
- [ ] HTTPS enforced
- [ ] Authentication required
- [ ] CSRF protection
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] Rate limiting
- [ ] OAuth tokens encrypted
- [ ] Privacy Policy published
- [ ] Terms of Service published
- [ ] Cookie consent banner
- [ ] Data export API
- [ ] Account deletion API
- [ ] GDPR consent tracking
- [ ] Audit logging

### Nice to Have
[Secondary security features]

### Testing
[Security testing checklist]

## 8. Incident Response Plan

### Definition of Incident
[3 categories]

### Response Steps
[6-step process]

### Data Breach Notification
[Legal requirements and process]

### Contact
[Email addresses for security issues]

## 9. Compliance Roadmap

### Phase 1 (MVP)
[Checklist of implemented features]

### Phase 2
[Upcoming security work]

### Phase 3
[Enhanced compliance]

### Phase 4 (Enterprise)
[SOC 2, ISO 27001, etc.]
```

**Critical Sections:**
- GDPR compliance implementation (with code)
- Data encryption (with code examples)
- Security checklist
- Incident response plan
- All legal requirements documented

---

## 8. SCALING_OPS_NOTES.md

**Purpose:** Operational guardrails to prevent runaway costs.

**Page Limit:** 6-7 pages

### Contents:

```markdown
# Scaling & Operations Notes

## MVP Limits (Week 1-2)

### User Limits
[Specific numbers]

### System Limits
[Technical constraints]

## AI Cost Guardrails

### Cost per Review
[Detailed calculation with and without caching]

### Daily Budget Limits
[Code implementation]

### Circuit Breaker
[Code implementation to prevent cascading failures]

## Rate Limits

### Per User
[Code examples for different rate limits]

### Per IP (Login)
[Login rate limiting code]

## Retry Logic (Phase 3)

### Exponential Backoff
[Code implementation]

## Monitoring for Failed AI Jobs

### Alert Triggers
[Code with Sentry integration]

### Metrics to Monitor
[5 key metrics with targets]

### Dashboards
[List of dashboards]

[Code example for metrics API]

## CSV Import Limits (Phase 2)

### File Size
[Specific limits]

### Processing
[Code for batch processing]

## Database Connection Pooling

[Prisma configuration]

## Backup & Recovery

### Automated Backups
[Supabase settings]

### Manual Backups
[Commands]

### Disaster Recovery Plan
[3-step process]

### RTO/RPO Targets
[Specific time targets]

## Operational Runbook

### Daily Tasks
[Checklist]

### Weekly Tasks
[Checklist]

### Monthly Tasks
[Checklist]

## Cost Optimization Checklist

### AI Costs
[Optimization techniques]

### Infrastructure Costs
[Free tier maximization]

### Database Costs
[Query optimization]

## Scaling Milestones

| Milestone | Users | Reviews/Day | Infra Changes |
|-----------|-------|-------------|---------------|
| MVP | 10 | 500 | None |
| Launch | 100 | 5,000 | Upgrade Supabase |
| Growth | 1,000 | 50,000 | Upgrade Vercel, Redis |
| Scale | 10,000 | 500,000 | Enterprise tier |
```

**Key Sections:**
- Specific cost calculations
- Code examples for guardrails
- Monitoring setup
- Operational checklists
- Scaling thresholds

---

## 9. AI_BEHAVIOR_QUALITY_GUIDE.md

**Purpose:** Prevent AI chaos. Document prompt strategy.

**Page Limit:** 8-10 pages

### Contents:

```markdown
# AI Behavior & Quality Guide

**Critical:** This guide defines how AI generates responses. Changes here affect product quality.

## 1. Prompt Structure

### System Prompt (Brand Voice)
[Complete code with all dynamic sections]

```typescript
const systemPrompt = `You are a professional customer service representative for ${brandProfile.brandName}...

BRAND VOICE GUIDELINES:
[...]

RESPONSE REQUIREMENTS:
[...]

QUALITY STANDARDS:
[...]
`;
```

### User Prompt (Review Context)
[Complete code]

## 2. Brand Voice Training Signals

### Explicit Training
[4 types user provides]

### Implicit Training (From Edits)
[Code to detect patterns]

### Phase 2: Vector Embeddings
[Future implementation with Pinecone]

## 3. Tone Controls

### Tone Slider (1-10)

| Value | Description | Example Response |
|-------|-------------|------------------|
| 1-2 | Very Formal | "Thank you for your review..." |
| 3-4 | Professional | "Thank you for taking the time..." |
| 5-6 | Balanced | "Thanks for the great review!" |
| 7-8 | Friendly | "Thanks so much! We're thrilled..." |
| 9-10 | Very Casual | "Awesome, thanks! 😊" |

[Code implementation]

### Personality Types
[4 personalities with examples and code]

## 4. Hallucination Guardrails

### Rules
[5 critical rules]

### Prompt Guardrails
[Anti-hallucination prompt addition]

### Detection (Future)
[Code to detect potential hallucinations]

## 5. Manual Override Rules

### When User Provides Custom Instructions
[Override hierarchy explanation]

### Implementation
[Code showing priority system]

## 6. Quality Metrics

### User Feedback
[TypeScript interface for feedback]

### Automated Metrics
[Metrics tracking interface]

### Quality Targets

| Metric | Target | Alert If |
|--------|--------|----------|
| Avg User Rating | >4.0 | <3.5 |
| Edit Rate | <30% | >50% |
| Approval Rate | >70% | <50% |
| Generation Time | <5s p95 | >10s p95 |
| Cost per Review | <$0.01 | >$0.02 |

## 7. Edge Cases

### Very Short Reviews
[Example + guideline]

### Very Long Reviews
[Example + guideline]

### Reviews in Mixed Languages
[Example + guideline]

### Sarcastic/Ironic Reviews
[Example + guideline]

### Spam/Inappropriate Reviews
[Example + guideline]

## 8. A/B Testing Prompts (Phase 3)

[Code for testing different prompt variants]

## 9. Prompt Evolution Checklist

[6-step process before changing prompts]

**Version Control:**
[Database schema for prompt versions]

## 10. Examples: Good vs Bad Responses

### Example 1: 5-Star Review
[Review text]
**❌ Bad Response:** [Example + why it's bad]
**✅ Good Response:** [Example + why it's good]

### Example 2: 1-Star Review
[Review text]
**❌ Bad Response:** [Example + why it's bad]
**✅ Good Response:** [Example + why it's good]

### Example 3: 3-Star Review
[Review text]
**❌ Bad Response:** [Example + why it's bad]
**✅ Good Response:** [Example + why it's good]

## 11. Multi-Language Quality

### Language Detection Confidence
[Code for handling low-confidence detections]

### Translation Quality Check (Future)
[Interface for showing original + translation]

## This Guide is a Living Document

Update frequency:
- Phase 1: After every 100 reviews
- Phase 2: After every 1,000 reviews
- Phase 3+: Quarterly review

Version: 1.0
Last Updated: [Date]
Next Review: [Date + 2 weeks]
```

**Critical Sections:**
- Complete prompt code
- Tone/personality examples
- Hallucination prevention
- Quality metrics
- Good vs bad response examples

---

## END OF PHASE 0

**Total Documents:** 9  
**Total Pages:** ~45-50 pages  
**Time to Create:** 3-5 days  
**Output:** Complete blueprint for vibe coding

**Action Items:**
1. Create all 9 documents
2. Review with stakeholders (if any)
3. Freeze scope
4. Begin Week 1 vibe coding

---

# PHASE 1: DURING VIBE CODING (Weeks 1-2)

**Rule:** DO NOT create new documents. Only update existing ones.

## Update Guidelines

### When to Update Documents:

**Update PRD_MVP_PHASE1.md IF:**
- Scope changes (feature added/removed)
- Acceptance criteria changes
- Technical constraints change

**Update DATA_MODEL.md IF:**
- Schema changes (new fields, new tables)
- New enum values
- Relationship changes

**Update AI_BEHAVIOR_QUALITY_GUIDE.md IF:**
- Prompt changes
- New edge cases discovered
- Quality metric thresholds adjusted

**Update ARCHITECTURE_DEPLOYMENT.md IF:**
- Tech stack changes (rare)
- New environment variables
- Deployment process changes

**DO NOT update:**
- User flows (unless fundamentally broken)
- API contracts (stick to original design)
- Security brief (locked for Phase 1)

## Decision Log

Create ONE additional lightweight document:

### DECISIONS.md

**Purpose:** Track all decisions during development

**Format:**
```markdown
# Development Decisions

## Week 1

### 2025-01-10: Changed tone slider from 1-5 to 1-10
- **Reason:** Users wanted more granular control
- **Impact:** Updated BrandProfile schema, updated prompts
- **Files:** prisma/schema.prisma, lib/ai/prompts.ts

### 2025-01-12: Added language confidence threshold
- **Reason:** Some reviews auto-detected wrong language
- **Impact:** Only auto-generate if confidence >0.7
- **Files:** lib/utils/language-detect.ts

### 2025-01-14: Increased max tokens from 150 to 200
- **Reason:** Responses getting cut off for longer reviews
- **Impact:** Increased cost by ~25%, but better quality
- **Cost:** From $0.0037 → $0.0048 per review
```

**Keep entries:**
- Date
- Decision summary
- Reason
- Impact
- Files changed
- Cost impact (if any)

## Output of Phase 1

**Working Product:**
- Manual review input ✅
- AI generation ✅
- Brand voice learning ✅
- Response editor ✅
- Multi-language support ✅
- Usage tracking ✅

**Updated Docs:**
- PRD with any scope changes
- Data model with any schema changes
- AI guide with refined prompts
- Decisions log

**Ready For:**
- 5 beta users
- Phase 2 (CSV import)

---

# PHASE 2: AFTER MVP SHIPS (End of Week 2)

**Purpose:** Prepare for CSV import and bulk processing

## Documents to Create (3 new)

---

## 10. PRD_CSV_IMPORT.md

**Page Limit:** 2-3 pages

### Contents:

```markdown
# PRD: CSV Import (Phase 2)

## Scope
Allow users to upload CSV files containing reviews from any platform.

## User Story
As a user with 100 Amazon reviews, I want to upload a CSV export so I can generate responses in bulk.

## Features IN SCOPE

### F1: CSV Upload
- Drag-and-drop file upload
- Or click to browse
- Support: .csv, .tsv files
- Max file size: 10 MB
- Max rows: 10,000 reviews

### F2: Format Auto-Detection
Detect common formats:
- Amazon Seller Central export
- Trustpilot export
- Google Business export
- Generic (user maps columns)

Auto-map columns:
- Review text → required
- Rating (1-5) → required
- Reviewer name → optional
- Date → optional
- Product name → optional
- Platform → auto-detect or ask user

### F3: Validation & Preview
After upload:
1. Parse file
2. Show preview (first 10 rows)
3. Show summary:
   - Total reviews: 247
   - Valid: 245
   - Invalid: 2 (missing rating)
   - Duplicates: 5 (already in system)
4. User confirms or cancels

### F4: Import Process
- Create "import batch" (trackable)
- Process reviews in batches of 100
- Show progress bar
- Handle errors gracefully (partial success OK)
- Show summary:
  - Imported: 240 reviews
  - Skipped: 5 duplicates
  - Failed: 2 invalid rows

### F5: Post-Import Actions
- Navigate to review list (filtered to this batch)
- Option: "Generate All Responses" (bulk action)
- Option: "Export Results" (after generating)

## Features OUT OF SCOPE
❌ Excel files (.xlsx) - convert to CSV first
❌ Real-time sync - manual upload only
❌ Scheduled imports
❌ Import from URL

## Acceptance Criteria
- [ ] User can upload 100-row CSV and see all reviews imported
- [ ] Duplicate reviews are skipped
- [ ] Invalid rows are reported clearly
- [ ] Progress bar shows accurate progress
- [ ] User can cancel import mid-process
- [ ] Imported reviews are tagged with batch ID

## Risks
1. Large files may timeout
   - Mitigation: Process async, show progress
2. Unknown CSV formats
   - Mitigation: Generic mapping UI
3. Database write performance
   - Mitigation: Batch inserts (100 at a time)
```

---

## 11. BULK_PROCESSING_JOBS.md

**Page Limit:** 3-4 pages

### Contents:

```markdown
# Bulk Processing & Jobs Design

## Overview
Enable processing of large batches (100-10,000 reviews) without blocking UI.

## Architecture

### Job Queue
Use Vercel Queue or Upstash QStash

```typescript
// Job types
interface ImportJob {
  id: string;
  userId: string;
  batchId: string;
  fileName: string;
  totalRows: number;
  processedRows: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errors: string[];
  createdAt: Date;
  completedAt?: Date;
}

interface GenerateJob {
  id: string;
  userId: string;
  reviewIds: string[];
  totalReviews: number;
  generated: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errors: string[];
}
```

### Chunking Strategy
[Code for processing 100 at a time]

### Retry & Backoff
[Exponential backoff code]

### Progress Tracking
[Server-Sent Events implementation]

### Partial Success Handling
[How to handle 240/247 success rate]

## Job Execution

### Process Flow
[Detailed flow diagram]

### Error Handling
[Code examples]

### Cancellation
[How user can cancel mid-process]

## Monitoring
[Metrics to track for bulk jobs]
```

---

## 12. COST_USAGE_MODEL.md

**Page Limit:** 3-4 pages

### Contents:

```markdown
# Cost & Usage Model

## Cost Breakdown

### AI Costs (Variable)
[Detailed calculation per review]
[With and without prompt caching]

### Infrastructure Costs (Fixed)
[Monthly breakdown by phase]

## Usage Limits by Plan

```typescript
const PLAN_LIMITS = {
  FREE: {
    reviewsPerMonth: 50,
    maxReviewsPerImport: 100,
    maxConcurrentImports: 1,
    retentionDays: 90,
    features: ['manual_input', 'csv_import', 'basic_analytics'],
  },
  STARTER: {
    reviewsPerMonth: 500,
    maxReviewsPerImport: 500,
    maxConcurrentImports: 3,
    retentionDays: Infinity,
    features: ['manual_input', 'csv_import', 'google_integration', 'analytics'],
  },
  // ... rest of plans
};
```

## Soft Quotas (Warnings)
[Code for warning at 80% usage]

## Hard Stops
[Code for stopping at 100% usage]

## Admin Visibility
[Admin metrics interface]

## Cost Optimization
[List of optimization strategies]

## Margin Calculations

| Plan | Price | Cost | Margin |
|------|-------|------|--------|
| FREE | $0 | $0.55 | Loss leader |
| STARTER | $29 | $5.50 | 5.3x ✅ |
| GROWTH | $99 | $22 | 4.5x ✅ |
| ENTERPRISE | $299 | $50 | 6x ✅ |
```

---

## Updated Documents

**Update ARCHITECTURE_DEPLOYMENT.md:**
- Add Vercel Queue/QStash to architecture
- Add CSV upload to file storage section

**Update SCALING_OPS_NOTES.md:**
- Add CSV import limits
- Add bulk job monitoring

---

# PHASE 3: AFTER CSV WORKS (Week 3)

**Purpose:** Prepare for first API integration (Google Business Profile)

## Documents to Create (4 new)

---

## 13. INTEGRATION_FRAMEWORK_GENERIC.md

**Page Limit:** 4-5 pages

### Contents:

```markdown
# Integration Framework (Generic Patterns)

## Purpose
Define reusable patterns for all platform integrations.

## Generic OAuth Pattern

### 1. Connect Flow
[Step-by-step with code]

### 2. Callback Handling
[Code implementation]

### 3. Token Refresh
[Auto-refresh code]

### 4. Token Storage
[Encryption before storage]

## Sync Frequency Model

### Real-time (Webhooks)
[If platform supports]

### Polling (Cron)
[Every 15 minutes pattern]

## Idempotency Strategy

[Code using externalId to prevent duplicates]

## Failure Recovery Patterns

### Retry Logic
[Exponential backoff]

### Circuit Breaker
[Stop after N failures]

### User Notification
[Email on persistent failures]

## Rate Limiting

### Per Integration
[Platform-specific limits]

### Backoff Strategy
[When rate limited]

## Data Normalization

[How to map platform data to our schema]

## Testing Strategy

### OAuth Flow Testing
[How to test without real accounts]

### Sync Testing
[Mock API responses]

## Security Considerations

### Token Encryption
[Always encrypt before storage]

### Token Rotation
[Refresh before expiry]

### Revocation Handling
[What to do when user disconnects]
```

---

## 14. INTEGRATION_PRD_GOOGLE.md

**Page Limit:** 2-3 pages

### Contents:

```markdown
# PRD: Google Business Profile Integration

## Scope
Connect to Google Business Profile, sync reviews, post responses.

## User Story
As a local business owner, I want to auto-sync my Google reviews so I don't have to manually copy-paste them.

## Prerequisites
- User must have Google Business Profile account
- User must have location(s) set up
- User must grant OAuth permissions

## Features

### F1: OAuth Connection
- "Connect Google Business" button
- OAuth flow to Google
- Request permissions:
  - `business.manage` (read + write reviews)
- Store encrypted tokens

### F2: Location Selection
- After OAuth, fetch user's locations
- User selects which location(s) to sync
- Support 1-100 locations
- Multi-location = separate Integration record each

### F3: Initial Sync
- On first connection, sync last 90 days of reviews
- Show progress: "Syncing 47 reviews from Joe's Pizza..."
- Handle duplicates (skip)
- Tag with integration source

### F4: Incremental Sync
- Every 15 minutes (Vercel Cron)
- Fetch new reviews only
- Update existing reviews if edited
- Handle deleted reviews (soft delete)

### F5: Post Responses
- "Post to Google" button on approved response
- Call Google API to post reply
- Handle errors gracefully
- Update status to "POSTED"

## Features OUT OF SCOPE
❌ Auto-post (user must approve first)
❌ Edit posted responses (Google doesn't allow)
❌ Delete reviews (only Google can)
❌ Review insights/analytics (Phase 4)

## Google API Details

**Endpoints:**
- Auth: `https://accounts.google.com/o/oauth2/v2/auth`
- Token: `https://oauth2.googleapis.com/token`
- List Reviews: `GET /v1/accounts/{accountId}/locations/{locationId}/reviews`
- Post Reply: `PUT /v1/accounts/{accountId}/locations/{locationId}/reviews/{reviewId}/reply`

**Rate Limits:**
- 600 requests per minute per project
- Mitigation: Our sync is <10 requests per location per sync

**Errors to Handle:**
- 401: Token expired (refresh)
- 403: Insufficient permissions (re-auth)
- 429: Rate limited (backoff)
- 404: Review deleted (soft delete)

## Acceptance Criteria
- [ ] User can connect Google account
- [ ] User can select location(s)
- [ ] Initial sync imports all reviews
- [ ] Incremental sync catches new reviews within 15 minutes
- [ ] User can post response to Google
- [ ] Posted responses show on Google Business Profile

## Risks
1. Google OAuth approval process may take weeks
   - Mitigation: Apply early, use test credentials for dev
2. Rate limits on high-traffic accounts
   - Mitigation: Batch requests, implement backoff
3. User has 100+ locations
   - Mitigation: Limit to 10 locations in MVP
```

---

## 15. INTEGRATION_TECHNICAL_SPEC_GOOGLE.md

**Page Limit:** 4-5 pages

### Contents:

```markdown
# Technical Spec: Google Business Profile Integration

## Architecture Overview

[Diagram: User → Our App → Google OAuth → Google My Business API]

## OAuth Implementation

### Dependencies
```bash
npm install @googleapis/mybusinessaccountmanagement
npm install @googleapis/mybusinessbusinessinformation
```

### OAuth Flow Code
[Complete implementation]

### Token Storage
[Encrypted storage code]

### Token Refresh
[Auto-refresh implementation]

## API Integration

### List Reviews
```typescript
async function fetchGoogleReviews(
  integration: Integration
): Promise<GoogleReview[]> {
  // Refresh token if needed
  const validIntegration = await refreshTokenIfNeeded(integration);
  const accessToken = decrypt(validIntegration.accessToken);
  
  // Call Google API
  const response = await fetch(
    `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  
  const data = await response.json();
  return data.reviews;
}
```

### Post Reply
[Code implementation]

### Data Mapping
[How to convert Google review to our schema]

## Sync Job

### Vercel Cron Setup
```typescript
// app/api/cron/sync-google-reviews/route.ts
export async function GET() {
  const integrations = await prisma.integration.findMany({
    where: {
      platform: 'GOOGLE_BUSINESS',
      status: 'ACTIVE',
      autoSync: true,
    }
  });
  
  for (const integration of integrations) {
    await syncGoogleReviews(integration);
  }
  
  return Response.json({ synced: integrations.length });
}
```

[Configure in vercel.json]

### Sync Logic
[Step-by-step process with code]

## Error Handling

### Token Expired
[Code to detect and refresh]

### Rate Limited
[Backoff strategy]

### Network Errors
[Retry logic]

### User Disconnected
[How to detect and handle]

## Testing

### Manual Testing
[Step-by-step test plan]

### Automated Testing
[Mock API responses]

## Monitoring

### Metrics to Track
- Sync success rate
- Sync duration
- Reviews synced per sync
- API errors by type

### Alerts
- Sync failures >10% → Slack alert
- Token refresh failures → Email user

## Deployment

### Environment Variables
```bash
GOOGLE_OAUTH_CLIENT_ID="..."
GOOGLE_OAUTH_CLIENT_SECRET="..."
GOOGLE_OAUTH_REDIRECT_URI="https://app.brandsiq.app/api/integrations/google/callback"
```

### Feature Flag
```typescript
const GOOGLE_INTEGRATION_ENABLED = process.env.FEATURE_GOOGLE === 'true';
```

### Rollout Plan
1. Test with 3 internal accounts
2. Beta to 10 users
3. Full release
```

---

## 16. DATA_MAPPING_GOOGLE.md

**Page Limit:** 2 pages

### Contents:

```markdown
# Data Mapping: Google Business Profile

## Review Fields

### Google → Our Schema

| Google Field | Our Field | Transformation | Notes |
|--------------|-----------|----------------|-------|
| `name` | `externalId` | Direct | "accounts/123/locations/456/reviews/789" |
| `comment` | `reviewText` | Direct | Full review text |
| `starRating` | `rating` | Map | "FIVE" → 5, "FOUR" → 4, etc. |
| `reviewer.displayName` | `reviewerName` | Direct | May be "A Google User" if anonymous |
| `createTime` | `reviewDate` | Parse ISO | "2025-01-15T10:30:00Z" → Date object |
| `updateTime` | `updatedAt` | Parse ISO | Track if review was edited |
| `reviewReply.comment` | Check existence | If exists, skip import | Already has response |

### Star Rating Mapping
```typescript
const GOOGLE_RATING_MAP = {
  'ONE': 1,
  'TWO': 2,
  'THREE': 3,
  'FOUR': 4,
  'FIVE': 5,
};
```

## Reply Fields

### Our Schema → Google

| Our Field | Google Field | Transformation | Notes |
|-----------|--------------|----------------|-------|
| `finalText` | `comment` | Direct | Max 4096 chars |

## Edge Cases

### Anonymous Reviewers
- Google provides: "A Google User"
- Store as-is in `reviewerName`

### Edited Reviews
- Google provides `updateTime`
- Check if `updateTime` > `createTime`
- Update our `reviewText` if changed

### Deleted Reviews
- Google returns 404 on fetch
- Soft delete in our database

### Reviews Without Text
- Some reviews have only rating, no text
- Store with `reviewText` = "" (empty string)
- Don't auto-generate response (no context)

## Example Data

### Google API Response
```json
{
  "name": "accounts/123/locations/456/reviews/789",
  "reviewer": {
    "displayName": "John Doe",
    "profilePhotoUrl": "https://..."
  },
  "starRating": "FIVE",
  "comment": "Great service! Fast delivery.",
  "createTime": "2025-01-15T10:30:00Z",
  "updateTime": "2025-01-15T10:30:00Z"
}
```

### Our Database Record
```typescript
{
  id: "clx1234567890",
  userId: "user_abc123",
  platform: "GOOGLE_BUSINESS",
  externalId: "accounts/123/locations/456/reviews/789",
  reviewText: "Great service! Fast delivery.",
  rating: 5,
  reviewerName: "John Doe",
  language: "en", // Auto-detected
  sentiment: "POSITIVE", // Auto-detected
  status: "PENDING",
  reviewDate: new Date("2025-01-15T10:30:00Z"),
  createdAt: new Date(),
  updatedAt: new Date(),
  integrationId: "int_xyz789",
}
```
```

---

## Updated Documents

**Update ARCHITECTURE_DEPLOYMENT.md:**
- Add Google OAuth to authentication section
- Add Google API to external services

**Update SECURITY_PRIVACY_BRIEF.md:**
- Add Google as sub-processor
- Update DPA section

---

# PHASE 4: AFTER GOOGLE INTEGRATION (Week 4)

**Purpose:** Team features and audit logging

## Documents to Create (3 new)

---

## 17. PERMISSIONS_ROLES.md

**Page Limit:** 2-3 pages

### Contents:

```markdown
# Permissions & Roles

## Role Types

### Workspace Owner
- Full access to all features
- Can add/remove team members
- Can delete workspace
- Can manage billing
- Can disconnect integrations

### Member
- Can view all reviews
- Can generate responses
- Can edit brand voice
- Cannot add/remove members
- Cannot delete workspace
- Cannot manage billing

### Read Only
- Can view reviews
- Can view responses
- Cannot generate responses
- Cannot edit anything

### Integration Access
Special permission for API integrations:
- Can connect/disconnect integrations
- Can trigger syncs
- Cannot access other features

## Permission Matrix

| Action | Owner | Member | Read Only |
|--------|-------|--------|-----------|
| View reviews | ✅ | ✅ | ✅ |
| Generate responses | ✅ | ✅ | ❌ |
| Edit brand voice | ✅ | ✅ | ❌ |
| Approve responses | ✅ | ✅ | ❌ |
| Post responses | ✅ | ✅ | ❌ |
| Add team members | ✅ | ❌ | ❌ |
| Remove team members | ✅ | ❌ | ❌ |
| Manage billing | ✅ | ❌ | ❌ |
| Connect integrations | ✅ | ❌ | ❌ |
| Delete workspace | ✅ | ❌ | ❌ |

## Implementation

### Database Schema
```prisma
model WorkspaceMember {
  id          String   @id @default(cuid())
  workspaceId String
  userId      String
  role        Role     @default(MEMBER)
  addedBy     String
  createdAt   DateTime @default(now())
  
  @@unique([workspaceId, userId])
}

enum Role {
  OWNER
  MEMBER
  READ_ONLY
}
```

### Permission Checks
```typescript
async function canGenerateResponse(userId: string, workspaceId: string): Promise<boolean> {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId }
    }
  });
  
  return member && ['OWNER', 'MEMBER'].includes(member.role);
}
```
```

---

## 18. AUDIT_ACTIVITY_LOG.md

**Page Limit:** 2 pages

### Contents:

```markdown
# Audit & Activity Log

## Purpose
Track all important actions for compliance and debugging.

## Events to Log

### User Actions
- User signup
- User login
- User logout
- Password change
- Email change

### Review Actions
- Review created (manual or import)
- Review deleted
- Response generated
- Response edited
- Response approved
- Response posted

### Integration Actions
- Integration connected
- Integration disconnected
- Sync triggered
- Sync completed
- Sync failed

### Team Actions
- Member added
- Member removed
- Role changed

### Billing Actions
- Plan upgraded
- Plan downgraded
- Payment succeeded
- Payment failed

## Database Schema

```prisma
model AuditLog {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  action      String   // "response_generated", "integration_connected"
  resource    String   // "review:abc123", "integration:xyz789"
  resourceId  String?
  
  // Context
  metadata    Json?    // Additional details
  ipAddress   String?
  userAgent   String?
  
  createdAt   DateTime @default(now())
  
  @@index([userId, createdAt])
  @@index([action, createdAt])
  @@index([resourceId])
}
```

## Implementation

### Logging Helper
```typescript
async function logAudit(params: {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: any;
  req?: Request;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      metadata: params.metadata,
      ipAddress: params.req?.headers.get('x-forwarded-for'),
      userAgent: params.req?.headers.get('user-agent'),
    }
  });
}

// Usage
await logAudit({
  userId,
  action: 'response_generated',
  resource: `review:${reviewId}`,
  resourceId: reviewId,
  metadata: {
    tokensUsed: 650,
    costCents: 0.26,
    language: 'en',
  },
  req,
});
```

## Retention

| Plan | Retention |
|------|-----------|
| FREE | 30 days |
| STARTER | 90 days |
| GROWTH | 365 days |
| ENTERPRISE | Unlimited |

## UI

### Activity Feed
Show recent actions:
- "You generated a response for 5-star review" (2 minutes ago)
- "Google Business sync completed: 12 new reviews" (15 minutes ago)
- "John Doe connected Shopify integration" (1 hour ago)
```

---

## 19. DATA_LIFECYCLE_GDPR_OPS.md

**Page Limit:** 3-4 pages

### Contents:

```markdown
# Data Lifecycle & GDPR Operations

## Review Retention Rules

### By Plan
| Plan | Retention | Enforcement |
|------|-----------|-------------|
| FREE | 90 days | Auto-delete after 90 days |
| STARTER | Unlimited | Never delete |
| GROWTH | Unlimited | Never delete |
| ENTERPRISE | Unlimited | Never delete |

### Implementation
```typescript
// Vercel Cron: Daily at 2 AM
export async function enforceRetention() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);
  
  await prisma.review.deleteMany({
    where: {
      user: { plan: 'FREE' },
      createdAt: { lt: cutoffDate },
      deletedAt: null,
    }
  });
}
```

## Brand Voice Retention

### Always Keep
- Brand voice settings are always kept
- Even for deleted users (30-day grace period)
- After 30 days, hard delete

## Delete Flows

### User-Initiated Delete (Soft Delete)
1. User clicks "Delete Review"
2. Set `deletedAt = now()`
3. Hide from UI immediately
4. Hard delete after 30 days

### Automated Delete (Hard Delete)
1. Cron job runs daily
2. Find soft-deleted items >30 days old
3. Hard delete from database
4. Irreversible

## Export Flows

### Full Data Export
```typescript
// GET /api/gdpr/export-data
async function exportUserData(userId: string) {
  const data = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      reviews: true,
      responses: true,
      brandProfile: true,
      integrations: {
        select: {
          platform: true,
          status: true,
          createdAt: true,
          // NEVER export tokens
        }
      },
      usage: true,
      auditLogs: true,
    }
  });
  
  // Return as JSON
  return JSON.stringify(data, null, 2);
}
```

### Partial Export
Allow user to export:
- All reviews (CSV)
- All responses (CSV)
- Audit logs (CSV)

## Legal Request Handling

### Law Enforcement Requests
1. Receive request via security@brandsiq.app
2. Verify legitimacy (legal team)
3. Extract requested data
4. Log access
5. Respond within legal timeframe (varies by jurisdiction)

### GDPR Requests from Review Subjects
If someone whose review is in our system requests deletion:
1. They must contact the platform (Google, Amazon, etc.)
2. We sync deletion from platform
3. If they contact us directly, explain process
4. Do NOT delete without platform deletion (could violate TOS)

## Data Breach Response

### Detection
[Monitoring alerts]

### Response Steps
1. Contain breach (disable affected feature)
2. Assess scope (what data, how many users)
3. Notify affected users within 72 hours (GDPR requirement)
4. Notify authorities if >10,000 users affected
5. Post-mortem and remediation

### Notification Template
[Email template for breach notification]
```

---

# PHASE 5: SHOPIFY INTEGRATION (Month 2)

**Purpose:** Reuse proven integration pattern

## Documents to Create (5 new)

---

## 20. INTEGRATION_PRD_SHOPIFY.md

Similar structure to Google PRD but for Shopify/Judge.me

---

## 21. INTEGRATION_TECHNICAL_SPEC_SHOPIFY.md

Similar structure to Google Technical Spec

---

## 22. DATA_MAPPING_SHOPIFY.md

Similar structure to Google Data Mapping

---

## 23. JOBS_FAILURE_HANDLING_SHOPIFY.md

**Page Limit:** 3 pages

### Contents:

```markdown
# Jobs & Failure Handling: Shopify

## Initial Backfill

### When User First Connects
1. Fetch last 90 days of reviews
2. Process in batches of 100
3. Show progress to user
4. Handle failures gracefully

### Implementation
[Code for backfill job]

## Incremental Sync

### Frequency
Every 15 minutes (Vercel Cron)

### Process
1. Check last sync timestamp
2. Fetch reviews since then
3. Upsert to database
4. Update last sync timestamp

### Implementation
[Code for incremental sync]

## Retry Logic

### Transient Failures
Retry with exponential backoff:
- 1st retry: 1 second
- 2nd retry: 2 seconds
- 3rd retry: 4 seconds
- Give up after 3 retries

### Persistent Failures
After 5 consecutive sync failures:
- Mark integration as ERROR
- Email user
- Disable auto-sync
- User must re-authorize

## Reconciliation

### Daily Full Sync
Once per day, fetch all reviews to catch:
- Edited reviews
- Deleted reviews
- Missed updates

### Implementation
[Code for reconciliation]

## Monitoring

### Metrics
- Sync success rate
- Sync duration
- Reviews synced per sync
- Failure rate by error type

### Alerts
- Sync failures >10% → Slack
- Sync duration >5 minutes → Investigate
```

---

## 24. SECURITY_PRIVACY_ADDENDUM_SHOPIFY.md

**Page Limit:** 2 pages

### Contents:

```markdown
# Security & Privacy Addendum: Shopify

## Personal Data Inventory

### Data We Receive from Shopify
- Review text (may contain PII)
- Reviewer name
- Reviewer email (if collected)
- Product name
- Order ID

### Data We Store
All of the above, encrypted at rest in Supabase

### Data We Share
Review text sent to Anthropic for AI generation

## Retention Rules

### Shopify-Sourced Reviews
Follow same retention as other reviews:
- FREE: 90 days
- PAID: Unlimited

### When User Disconnects Shopify
- Stop syncing immediately
- Keep existing reviews (they still own this data)
- User can manually delete if desired

## Deletion Propagation

### When User Deletes Review in Our App
- Delete from our database
- Do NOT delete from Shopify (we can't)

### When Review Deleted on Shopify
- Detect on next sync (404 error)
- Soft delete in our database
- Hard delete after 30 days

## Subprocessor Handling

### Judge.me
- Judge.me is the review app on Shopify
- We integrate with Judge.me API, not Shopify directly
- Judge.me is a separate subprocessor

### Data Flow
User → Shopify → Judge.me → Our App → Anthropic

### DPA Requirements
Ensure Judge.me has GDPR-compliant DPA
```

---

## 25. QA_RELEASE_PLAN_SHOPIFY.md

**Page Limit:** 2 pages

### Contents:

```markdown
# QA & Release Plan: Shopify Integration

## Test Matrix

### OAuth Flow
- [ ] User can connect Shopify store
- [ ] User can disconnect Shopify store
- [ ] Token refresh works automatically
- [ ] OAuth errors handled gracefully

### Initial Sync
- [ ] Syncs last 90 days of reviews
- [ ] Shows accurate progress
- [ ] Handles 1,000+ reviews
- [ ] Handles 0 reviews (new store)

### Incremental Sync
- [ ] New reviews appear within 15 minutes
- [ ] Edited reviews update correctly
- [ ] Deleted reviews soft delete
- [ ] No duplicates created

### Response Posting
- [ ] Can post response to Shopify/Judge.me
- [ ] Posted response appears on Shopify
- [ ] Errors handled (network, auth, etc.)

### Edge Cases
- [ ] Multiple products in one order
- [ ] Review without text (rating only)
- [ ] Review in non-English language
- [ ] Very long review (>2000 chars)
- [ ] Special characters in review

## Feature Flag Plan

### Rollout Stages
1. **Internal Testing (Week 1)**
   - Flag: `SHOPIFY_INTEGRATION_INTERNAL = true`
   - Test with 3 internal Shopify stores
   
2. **Beta Testing (Week 2)**
   - Flag: `SHOPIFY_INTEGRATION_BETA = true`
   - Invite 10 beta users
   - Collect feedback
   
3. **Gradual Rollout (Week 3)**
   - Day 1: 10% of users
   - Day 3: 25% of users
   - Day 5: 50% of users
   - Day 7: 100% of users
   
4. **Full Release (Week 4)**
   - Remove feature flag
   - Announce on blog/social

## Rollback Steps

### If Critical Bug Found
1. Set feature flag to `false`
2. Integration immediately disabled for all users
3. Existing synced reviews remain
4. Fix bug
5. Re-enable for beta users
6. Re-test
7. Re-enable for all users

### Rollback Procedure
```bash
# In Vercel dashboard
1. Go to Environment Variables
2. Set SHOPIFY_INTEGRATION_ENABLED=false
3. Redeploy
# Takes effect in <1 minute
```

## Success Criteria

Before full release:
- [ ] 0 critical bugs in beta
- [ ] Sync success rate >95%
- [ ] User satisfaction >4.0/5.0
- [ ] Support tickets <5 per 100 users
- [ ] Performance: Sync <30s for 100 reviews
```

---

# PHASE 6: PLATFORM MATURITY (Month 3+)

**Purpose:** Scale to production-grade platform

## Documents to Create (As Needed)

---

## 26. BILLING_PLANS.md

**Page Limit:** 3-4 pages

### Contents:

```markdown
# Billing & Plans

## Plan Structure

### FREE
- Price: $0
- Reviews: 50/month
- Features: Manual input, CSV import, basic analytics
- Support: Email (48-hour response)

### STARTER
- Price: $29/month
- Reviews: 500/month
- Features: + Google integration, + Yelp integration
- Support: Email (24-hour response)

### GROWTH
- Price: $99/month
- Reviews: 2,000/month
- Features: + All integrations, + Team members (3), + Priority support
- Support: Email (4-hour response) + Chat

### ENTERPRISE
- Price: $299/month (or custom)
- Reviews: Unlimited
- Features: + Everything, + Unlimited team members, + Custom integrations, + SLA
- Support: Dedicated account manager, Phone support

## Limits by Plan

[Comprehensive table of all limits]

## Feature Gating

### Implementation
```typescript
const PLAN_FEATURES = {
  FREE: new Set(['manual_input', 'csv_import', 'basic_analytics']),
  STARTER: new Set(['manual_input', 'csv_import', 'google_integration', 'analytics']),
  GROWTH: new Set(['all']),
  ENTERPRISE: new Set(['all', 'custom_integrations', 'sla']),
};

function hasFeature(user: User, feature: string): boolean {
  const features = PLAN_FEATURES[user.plan];
  return features.has('all') || features.has(feature);
}

// Usage
if (!hasFeature(user, 'google_integration')) {
  throw new Error('Upgrade to Starter plan to use Google integration');
}
```

## Overages

### Soft Limit (Warning)
At 90% of quota:
- Show warning banner
- Email user
- Suggest upgrade

### Hard Limit (Block)
At 100% of quota:
- Prevent new reviews
- Prevent AI generation
- Show upgrade modal

### Overage Pricing (Future)
- $0.10 per review over quota
- Only for GROWTH and ENTERPRISE
- Billed monthly

## Grace Periods

### Payment Failed
- Day 1: Retry payment
- Day 3: Email user
- Day 7: Downgrade to FREE
- Day 30: Delete data (with warning)

### Cancellation
- Immediate: Stop billing
- 30 days: Retain data
- After 30 days: Delete data

## Annual Pricing

### Discount: 20% off
- STARTER: $29/mo → $278/year ($23/mo effective)
- GROWTH: $99/mo → $950/year ($79/mo effective)
- ENTERPRISE: Custom

## Upgrade/Downgrade

### Upgrade: Immediate
- Charge prorated amount
- New limits apply immediately

### Downgrade: End of Billing Period
- Current plan remains until end of period
- New plan starts next billing cycle
- Warn if over new limits
```

---

## 27. PUBLIC_API_SPEC.md

**Page Limit:** 5-6 pages

### Contents:

```markdown
# Public API Specification

## Overview

Allow third-party developers to integrate with BrandsIQ.

## Authentication

### API Keys
Users generate API keys in dashboard:
```
X-API-Key: rvf_live_abc123...
```

### Rate Limits
- FREE: 100 requests/hour
- STARTER: 500 requests/hour
- GROWTH: 2,000 requests/hour
- ENTERPRISE: 10,000 requests/hour

## Endpoints

### 1. List Reviews
```
GET /api/v1/reviews
Authorization: Bearer {api_key}

Query Parameters:
- status: pending | draft | approved | posted
- platform: google | shopify | amazon
- limit: 1-100 (default 20)
- offset: 0+ (default 0)

Response:
{
  "data": [
    {
      "id": "review_abc123",
      "platform": "google",
      "reviewText": "Great service!",
      "rating": 5,
      "language": "en",
      "status": "pending",
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 47,
    "limit": 20,
    "offset": 0
  }
}
```

### 2. Generate Response
[Endpoint spec]

### 3. Get Response
[Endpoint spec]

### 4. Update Response
[Endpoint spec]

### 5. Create Review
[Endpoint spec]

## Versioning

### API Versions
- v1: Current
- v2: Future (with deprecation notice)

### Deprecation Policy
- 6 months notice before deprecation
- Old version supported for 12 months after deprecation

## Webhooks (Future)

### Events
- `review.created`
- `review.updated`
- `response.generated`
- `response.approved`
- `response.posted`

### Payload
[Webhook payload structure]
```

---

## 28. PLATFORM_RELIABILITY_PLAYBOOK.md

**Page Limit:** 4-5 pages

### Contents:

```markdown
# Platform Reliability Playbook

## Incident Response

### Severity Levels

**P0 (Critical)**
- Complete outage
- Data loss
- Security breach
Response: Immediate (15 minutes)

**P1 (High)**
- Major feature broken
- Performance degradation >50%
Response: 1 hour

**P2 (Medium)**
- Minor feature broken
- Performance degradation <50%
Response: 4 hours

**P3 (Low)**
- Cosmetic issues
- Documentation errors
Response: Next business day

### Incident Response Team
- On-call engineer (24/7)
- Engineering lead
- Product lead
- Customer support

### Response Steps
1. **Detect** (monitoring alerts)
2. **Acknowledge** (engineer claims incident)
3. **Assess** (severity, scope, impact)
4. **Communicate** (status page, users)
5. **Mitigate** (temporary fix)
6. **Resolve** (permanent fix)
7. **Post-mortem** (within 48 hours)

## Third-Party Outages

### Anthropic API Down
**Symptoms:** AI generation fails
**Mitigation:**
- Show user-friendly error
- Queue failed generations
- Retry when service restores
- Don't charge user for failed attempts

### Google API Down
**Symptoms:** Can't sync Google reviews
**Mitigation:**
- Disable sync temporarily
- Queue sync for later
- Show status on integrations page
- Email users when restored

### Supabase Down
**Symptoms:** Can't access database
**Mitigation:**
- Show maintenance page
- No mitigation possible (critical dependency)
- Escalate to Supabase support

### Vercel Down
**Symptoms:** App unreachable
**Mitigation:**
- No mitigation possible (critical dependency)
- Escalate to Vercel support
- Consider multi-cloud in future

## AI Degradation Mode

### If AI Quality Drops
**Symptoms:** User reports AI responses are bad
**Actions:**
1. Check AI model version (did Anthropic update?)
2. Check prompt changes (recent deployments?)
3. Review quality metrics
4. Rollback if needed
5. A/B test improvements

### If AI Costs Spike
**Symptoms:** Cost per review >$0.02
**Actions:**
1. Check for prompt caching issues
2. Check token usage (are prompts too long?)
3. Implement aggressive caching
4. Consider cheaper model for some languages

## Monitoring & Alerts

### What to Monitor
[List of 20+ metrics]

### Alert Thresholds
[Table of metrics and alert conditions]

### On-Call Rotation
[Schedule and escalation]

## Post-Mortem Template

```markdown
# Incident Post-Mortem

Date: [Date]
Severity: P[0-3]
Duration: [X hours]
Impact: [Y users affected]

## Timeline
- 14:23: First alert
- 14:25: Engineer acknowledged
- 14:30: Root cause identified
- 15:00: Fix deployed
- 15:10: Verified resolved

## Root Cause
[What went wrong]

## Impact
[How many users, what features]

## Fix
[What we did to resolve]

## Prevention
[What we'll do to prevent recurrence]

## Action Items
- [ ] Add monitoring for X
- [ ] Update documentation
- [ ] Improve alerting
```
```

---

# Documentation Principles (Summary)

## When to Create a Doc

**Create when:**
- About to introduce new risk (CSV → scale risk)
- About to ship new integration (API → trust risk)
- About to add team features (permission → security risk)

**Don't create when:**
- Just brainstorming ideas
- Feature is in "someday/maybe"
- No clear implementation timeline

## When to Update a Doc

**Update when:**
- Scope changes
- Schema changes
- Prompts change
- Security requirements change

**Don't update when:**
- Just fixing typos (unless critical)
- Minor code refactors
- UI polish

## Doc Quality Standards

**Good docs:**
- Specific (not "handle errors" but "retry 3 times with exponential backoff")
- Code examples included
- Acceptance criteria clear
- Risks identified

**Bad docs:**
- Vague ("build integration")
- No code examples
- No success criteria
- Risks ignored

## Version Control

**All docs should be:**
- In Git (alongside code)
- Versioned (update "Last Modified" date)
- Reviewed before major changes
- Referenced in PRs

---

# Final Checklist

## Before Starting Phase 0
- [ ] Understand product vision
- [ ] Know target users
- [ ] Have rough timeline (12 weeks)
- [ ] Know budget ($5-10K)

## After Phase 0
- [ ] All 9 docs created
- [ ] Reviewed by team (if applicable)
- [ ] Scope frozen
- [ ] Ready to start vibe coding

## After Phase 1
- [ ] Working MVP
- [ ] 5 beta users testing
- [ ] Decisions logged
- [ ] Ready for CSV import

## After Phase 2
- [ ] CSV import works
- [ ] Bulk processing tested
- [ ] Cost model validated
- [ ] Ready for integrations

## After Phase 3+
- [ ] First integration shipped
- [ ] Security audit complete
- [ ] GDPR compliance verified
- [ ] Ready for scale

---

**Remember:** Docs follow risk. Write only what you need, when you need it.

**Good luck building!** 🚀

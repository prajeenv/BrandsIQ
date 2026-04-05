# BrandsIQ Implementation Guide
## AI-Assisted Development with Claude Code

**Project Status:** Phase 0 Complete ✅ | Ready for Phase 1 Development

---

## Quick Navigation

📚 **Complete Implementation Guide:** [`docs/phase-0/10_CLAUDE_CODE_PROMPTS.md`](docs/phase-0/10_CLAUDE_CODE_PROMPTS.md)

📋 **Documentation Index:** [`docs/DOCUMENTATION_ROADMAP.md`](docs/DOCUMENTATION_ROADMAP.md)

---

## What is BrandsIQ?

An AI-powered review response management platform that helps SMBs automatically generate personalized, on-brand responses to customer reviews across multiple platforms (Google Business, Amazon, Shopify, Trustpilot) with:

- 🤖 **AI Response Generation** - Claude-powered responses in 40+ languages
- 😊 **Sentiment Analysis** - Automatic review sentiment tracking
- 🎨 **Brand Voice Learning** - Customizable tone and style
- 💳 **Credit-Based System** - Fair, usage-based pricing
- 🌍 **Multi-Language Native** - Responds in review's original language

**Target:** SMBs with 20-200 reviews/month, currently spending 5-15 hours/week on manual responses.

---

## Implementation Approach

This project uses **"Vibe Coding"** - AI-assisted development with comprehensive documentation written before code:

```
Phase 0: Documentation (Week 0) ✅ COMPLETE
  └─ 9 detailed specification documents
  
Phase 1: Core MVP (Week 1-2) ← YOU ARE HERE
  └─ Manual input, AI generation, credit system
  
Phase 2: CSV Import (Week 3)
  └─ Bulk upload, batch processing
  
Phase 3: Google Integration (Week 4)
  └─ OAuth, auto-sync, API posting
```

---

## Getting Started with Claude Code

### Step 1: Review Phase 0 Documentation

Read all documents in `docs/phase-0/` to understand the complete system:

1. **01_PRODUCT_ONE_PAGER.md** - Product vision, pricing, success metrics
2. **02_PRD_MVP_PHASE1.md** - Detailed feature requirements
3. **03_USER_FLOWS.md** - User journey maps and flows
4. **04_DATA_MODEL.md** - Complete database schema (Prisma)
5. **05_API_CONTRACTS.md** - All API endpoints specification
6. **06_SECURITY_PRIVACY.md** - Security requirements and best practices
7. **07_AUTHENTICATION_SYSTEM.md** - NextAuth.js implementation guide
8. **08_GDPR_COMPLIANCE.md** - Data protection and privacy compliance
9. **09_MULTILANGUAGE_SUPPORT.md** - Multi-language architecture
10. **10_CLAUDE_CODE_PROMPTS.md** - Step-by-step implementation prompts

### Step 2: Understand the Architecture

**Tech Stack:**
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** PostgreSQL (Supabase)
- **Authentication:** NextAuth.js v5 (Email/Password + Google OAuth)
- **AI Services:** Claude API (responses), DeepSeek API (sentiment)
- **Email:** Resend
- **Deployment:** Vercel

**Key Design Principles:**
- Credit-based pricing (not review-based)
- Separate sentiment quota (DeepSeek is cheaper)
- Multi-language native (no translation layer)
- Brand voice learning from user examples
- Fraud prevention with audit trails
- GDPR compliant from day 1

### Step 3: Follow Implementation Prompts

Open [`docs/phase-0/10_CLAUDE_CODE_PROMPTS.md`](docs/phase-0/10_CLAUDE_CODE_PROMPTS.md) and execute prompts sequentially:

**Prompt 0:** Planning & Architecture Review (0.5 day)
- Validate tech stack
- Create project structure
- Identify risks

**Prompt 1:** Project Setup & Configuration (0.5 day)
- Initialize Next.js project
- Install dependencies
- Configure environment

**Prompt 2:** Database Schema & Prisma Setup (0.5 day)
- Implement Prisma schema
- Connect to Supabase
- Run migrations

**Prompt 3:** Authentication System (1.5 days)
- NextAuth.js configuration
- Email/password + Google OAuth
- Protected routes

**Prompt 4:** Dashboard & Core UI (2 days)
- Dashboard layout
- Review pages
- Shared components

**Prompt 5:** Review Management (1.5 days)
- CRUD operations
- Language detection
- Filters and search

**Prompt 6:** Brand Voice Configuration (1 day)
- Settings page
- Tone customization
- Sample responses

**Prompt 7:** AI Response Generation (2 days)
- Claude API integration
- Multi-language support
- Credit tracking

**Prompt 8:** Sentiment Analysis (1 day)
- DeepSeek API integration
- Quota management
- Batch analysis

**Prompt 9:** Credit System (1 day)
- Credit tracking
- Usage history
- Monthly reset

**Prompt 10:** Testing, Deployment & Finalization (2 days)
- End-to-end testing
- Vercel deployment
- Monitoring setup

**Total Timeline:** 14 days (2 weeks)

---

## Development Workflow

### Local Development

```bash
# 1. Clone repository
git clone <repository-url>
cd brandsiq

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# 4. Set up database
npx prisma migrate dev
npx prisma generate

# 5. Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Working with Claude Code

**For each prompt:**

1. **Provide context:** Upload relevant Phase 0 documents
2. **Execute prompt:** Copy prompt text to Claude Code
3. **Review output:** Check generated code carefully
4. **Test functionality:** Verify feature works as specified
5. **Document changes:** Note any deviations from plan
6. **Commit progress:** Git commit after each completed prompt

**Example workflow for Prompt 3 (Authentication):**
```bash
# Start with documentation
open docs/phase-0/07_AUTHENTICATION_SYSTEM.md

# Provide to Claude Code:
# - 07_AUTHENTICATION_SYSTEM.md
# - 02_PRD_MVP_PHASE1.md (Epic 1: Authentication)
# - 03_USER_FLOWS.md (Authentication flows)

# Execute Prompt 3 from 10_CLAUDE_CODE_PROMPTS.md

# Test authentication
npm run dev
# Test signup, email verification, login, OAuth

# Commit if all tests pass
git add .
git commit -m "feat: implement authentication system (Prompt 3)"
```

---

## Key Implementation Guidelines

### 1. Follow Documentation Exactly
The Phase 0 docs are the **source of truth**. Implement exactly as specified unless you have a compelling reason to deviate (document why).

### 2. Test After Each Prompt
Don't proceed to the next prompt until current functionality is working. Run the testing checklist included in each prompt.

### 3. Maintain Type Safety
Use TypeScript strictly. No `any` types. Define interfaces for all data structures.

### 4. Handle Errors Gracefully
Every API call should have error handling. Every user action should have loading/error states.

### 5. Think About Edge Cases
Consider what could go wrong and handle it. Examples:
- User has 0 credits
- API timeout
- Duplicate submissions
- Network errors

### 6. Security First
- Never log sensitive data (passwords, API keys)
- Always validate user input
- Use transactions for credit deduction
- Prevent SQL injection (Prisma handles this)
- Implement rate limiting

### 7. GDPR Compliance
- Data export functionality
- Account deletion (soft delete with anonymization)
- Clear consent flows
- Privacy policy and terms

---

## Critical Success Criteria

Phase 1 MVP is complete when:

- ✅ User can sign up and verify email
- ✅ User can add reviews manually
- ✅ AI generates responses in review's language
- ✅ Brand voice is applied to responses
- ✅ Credits track accurately (100% precision)
- ✅ Sentiment analysis runs automatically
- ✅ Multi-language works (test 5+ languages)
- ✅ Response generation <5 seconds
- ✅ No critical bugs
- ✅ 5 beta users complete full journey

---

## Common Issues & Solutions

### Issue: Claude API Timeout
**Solution:** Implement retry logic with exponential backoff (3 attempts)

### Issue: Credit Deduction Race Condition
**Solution:** Always use database transactions for credit operations

### Issue: Language Detection Fails
**Solution:** Default to English, allow manual override

### Issue: Out of Credits Error
**Solution:** Show upgrade modal, prevent generation, allow editing

### Issue: Sentiment Quota Exceeded
**Solution:** Save review without sentiment, offer manual analysis button

---

## Resources

### Documentation
- [Next.js 14 Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [NextAuth.js v5 Docs](https://next-auth.js.org/)
- [Claude API Docs](https://docs.anthropic.com/)
- [shadcn/ui Components](https://ui.shadcn.com/)

### Environment Setup
- [Supabase Setup Guide](https://supabase.com/docs/guides/getting-started)
- [Vercel Deployment Guide](https://vercel.com/docs/deployments/overview)
- [Google OAuth Setup](https://console.cloud.google.com/)

### API Keys Required
- Supabase (Database)
- Anthropic Claude API (Response generation)
- DeepSeek API (Sentiment analysis)
- Resend (Email service)
- Google OAuth (Authentication)

---

## Project Structure After Setup

```
brandsiq/
├── IMPLEMENTATION.md              ← You are here
├── README.md                      ← Project overview
├── docs/
│   ├── DOCUMENTATION_ROADMAP.md
│   └── phase-0/                   ← Phase 1 specs
│       └── 10_CLAUDE_CODE_PROMPTS.md  ← Implementation guide
│
├── src/
│   ├── app/                       ← Next.js 14 App Router
│   │   ├── (auth)/                ← Auth pages
│   │   ├── (dashboard)/           ← Dashboard pages
│   │   └── api/                   ← API routes
│   ├── components/                ← React components
│   │   ├── ui/                    ← shadcn/ui components
│   │   ├── auth/
│   │   ├── dashboard/
│   │   └── reviews/
│   ├── lib/                       ← Utilities
│   │   ├── prisma.ts
│   │   ├── auth.ts
│   │   ├── claude-api.ts
│   │   └── deepseek-api.ts
│   ├── types/                     ← TypeScript types
│   └── hooks/                     ← Custom React hooks
│
├── prisma/
│   └── schema.prisma              ← Database schema
│
├── .env.local                     ← Environment variables
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

---

## Next Steps

1. ✅ **Phase 0 Complete** - All documentation written
2. 👉 **Start Prompt 0** - Planning & Architecture Review
3. → **Execute Prompts 1-10** - Build Phase 1 MVP
4. → **Beta Launch** - 5 users testing
5. → **Phase 2** - CSV Import (Week 3)

---

## Need Help?

- **Documentation Questions:** Review `docs/DOCUMENTATION_ROADMAP.md`
- **Implementation Questions:** Check `docs/phase-0/10_CLAUDE_CODE_PROMPTS.md`
- **Technical Issues:** Each prompt has troubleshooting section
- **Architecture Decisions:** Refer to Phase 0 documents

---

**Remember:** The documentation is comprehensive. Trust the process. Follow the prompts sequentially. Test thoroughly. Ship confidently. 🚀

**Last Updated:** January 7, 2026  
**Status:** Ready for Phase 1 Development

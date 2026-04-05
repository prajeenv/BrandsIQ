# BrandsIQ
## AI-Powered Review Response Management Platform

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.0-2D3748)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

> **Save 10+ hours per week** responding to customer reviews with AI-powered, on-brand responses in 40+ languages.

BrandsIQ helps SMBs automatically generate personalized, brand-aligned responses to customer reviews across multiple platforms (Google Business, Amazon, Shopify, Trustpilot) with built-in sentiment analysis and multi-language support.

---

## 🎯 Why BrandsIQ?

**The Problem:**
- Businesses spend 5-15 hours/week manually responding to reviews
- Inconsistent tone across team members dilutes brand voice
- Language barriers prevent responding to international customers
- Reviews scattered across multiple platforms
- No insights into sentiment trends

**The Solution:**
- ⚡ **10x faster** - Generate responses in seconds, not minutes
- 🎨 **Brand consistency** - AI learns your unique tone and style
- 🌍 **40+ languages** - Native-quality responses automatically
- 📊 **Sentiment tracking** - Understand customer satisfaction trends
- 💳 **Fair pricing** - Pay only for AI responses generated

---

## ✨ Features

### Phase 1: Core MVP (Current)
- ✅ **AI Response Generation** - Claude-powered responses matching your brand voice
- ✅ **Manual Review Input** - Copy-paste reviews from any platform
- ✅ **Brand Voice Customization** - Define tone, formality, key phrases, and style
- ✅ **Multi-Language Support** - Auto-detect and respond in 40+ languages
- ✅ **Sentiment Analysis** - Automatic positive/neutral/negative classification
- ✅ **Credit System** - Usage-based pricing with transparent tracking
- ✅ **Response Editor** - Edit, regenerate, or approve AI suggestions
- ✅ **Authentication** - Email/password + Google OAuth

### Phase 2: CSV Import (Week 3)
- ⏳ Bulk upload reviews from CSV files
- ⏳ Auto-detect formats (Amazon, Google, Trustpilot, etc.)
- ⏳ Batch processing for 100+ reviews
- ⏳ Export responses as CSV for manual posting

### Phase 3: Platform Integrations (Week 4+)
- ⏳ Google Business Profile integration (OAuth + auto-sync)
- ⏳ Shopify integration
- ⏳ Amazon integration
- ⏳ One-click response posting

---

## 🛠 Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui (Radix UI)
- **Forms:** React Hook Form + Zod validation
- **Icons:** Lucide React

### Backend
- **API:** Next.js API Routes
- **Database:** PostgreSQL (via Supabase)
- **ORM:** Prisma
- **Authentication:** NextAuth.js v5

### AI & External Services
- **Response Generation:** Claude API (Anthropic)
- **Sentiment Analysis:** DeepSeek API
- **Email:** Resend
- **Hosting:** Vercel

### Development Tools
- **Package Manager:** npm
- **Linting:** ESLint
- **Formatting:** Prettier
- **Git Hooks:** Husky (optional)
- **CI/CD:** Vercel (automatic)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (Supabase recommended)
- Claude API key (from [Anthropic](https://console.anthropic.com/))
- DeepSeek API key (from [DeepSeek](https://platform.deepseek.com/))
- Resend API key (from [Resend](https://resend.com/))
- Google OAuth credentials (optional, from [Google Cloud Console](https://console.cloud.google.com/))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/brandsiq.git
   cd brandsiq
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your credentials:
   ```bash
   # Database
   DATABASE_URL="postgresql://user:password@host:5432/brandsiq"
   
   # NextAuth
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="[generate-with-openssl-rand-base64-32]"
   
   # OAuth (optional)
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   
   # AI APIs
   ANTHROPIC_API_KEY="sk-ant-..."
   DEEPSEEK_API_KEY="sk-..."
   
   # Email
   RESEND_API_KEY="re_..."
   
   # App Config
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

4. **Set up the database**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Seed the database (optional)**
   ```bash
   npx prisma db seed
   ```

6. **Run the development server**
   ```bash
   npm run dev
   ```

7. **Open the app**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 📖 Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[IMPLEMENTATION.md](IMPLEMENTATION.md)** - AI-assisted development guide
- **[DOCUMENTATION_ROADMAP.md](docs/DOCUMENTATION_ROADMAP.md)** - Master documentation index

### Phase 0 Documentation (Complete Specifications)

1. **[Product One-Pager](docs/phase-0/01_PRODUCT_ONE_PAGER.md)** - Vision, pricing, success metrics
2. **[PRD MVP Phase 1](docs/phase-0/02_PRD_MVP_PHASE1.md)** - Detailed feature requirements
3. **[User Flows](docs/phase-0/03_USER_FLOWS.md)** - User journey maps and flows
4. **[Data Model](docs/phase-0/04_DATA_MODEL.md)** - Complete database schema
5. **[API Contracts](docs/phase-0/05_API_CONTRACTS.md)** - All API endpoints specification
6. **[Security & Privacy](docs/phase-0/06_SECURITY_PRIVACY.md)** - Security requirements
7. **[Authentication System](docs/phase-0/07_AUTHENTICATION_SYSTEM.md)** - NextAuth.js implementation
8. **[GDPR Compliance](docs/phase-0/08_GDPR_COMPLIANCE.md)** - Data protection and privacy
9. **[Multi-Language Support](docs/phase-0/09_MULTILANGUAGE_SUPPORT.md)** - Multi-language architecture
10. **[Claude Code Prompts](docs/phase-0/10_CLAUDE_CODE_PROMPTS.md)** - Step-by-step implementation

---

## 🏗 Project Structure

```
brandsiq/
├── src/
│   ├── app/                      # Next.js 14 App Router
│   │   ├── (auth)/               # Authentication pages
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   └── verify-email/
│   │   ├── (dashboard)/          # Dashboard pages
│   │   │   ├── dashboard/
│   │   │   ├── reviews/
│   │   │   └── settings/
│   │   ├── api/                  # API routes
│   │   │   ├── auth/
│   │   │   ├── reviews/
│   │   │   ├── responses/
│   │   │   ├── brand-voice/
│   │   │   └── credits/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/               # React components
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── auth/                 # Authentication components
│   │   ├── dashboard/            # Dashboard components
│   │   ├── reviews/              # Review management components
│   │   └── shared/               # Shared components
│   │
│   ├── lib/                      # Utilities and helpers
│   │   ├── prisma.ts             # Prisma client
│   │   ├── auth.ts               # Auth utilities
│   │   ├── claude-api.ts         # Claude API integration
│   │   ├── deepseek-api.ts       # DeepSeek API integration
│   │   ├── email.ts              # Email utilities
│   │   ├── validations.ts        # Zod schemas
│   │   └── utils.ts              # General utilities
│   │
│   ├── types/                    # TypeScript type definitions
│   │   ├── index.ts
│   │   ├── auth.ts
│   │   ├── review.ts
│   │   └── response.ts
│   │
│   └── hooks/                    # Custom React hooks
│       ├── use-credits.ts
│       ├── use-reviews.ts
│       └── use-brand-voice.ts
│
├── prisma/
│   ├── schema.prisma             # Database schema
│   ├── migrations/               # Database migrations
│   └── seed.ts                   # Seed data (optional)
│
├── docs/                         # Documentation
│   ├── DOCUMENTATION_ROADMAP.md
│   └── phase-0/                  # Phase 1 specifications
│
├── public/                       # Static assets
│
├── .env.example                  # Environment variables template
├── .env.local                    # Your environment variables (gitignored)
├── .gitignore
├── IMPLEMENTATION.md             # Implementation guide
├── README.md                     # This file
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## 🔑 Environment Variables

### Required Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `DATABASE_URL` | PostgreSQL connection string | [Supabase](https://supabase.com/) |
| `NEXTAUTH_URL` | App URL (http://localhost:3000 for dev) | - |
| `NEXTAUTH_SECRET` | Secret for session encryption | `openssl rand -base64 32` |
| `ANTHROPIC_API_KEY` | Claude API key | [Anthropic Console](https://console.anthropic.com/) |
| `DEEPSEEK_API_KEY` | DeepSeek API key | [DeepSeek Platform](https://platform.deepseek.com/) |
| `RESEND_API_KEY` | Email service API key | [Resend](https://resend.com/) |

### Optional Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | [Google Cloud Console](https://console.cloud.google.com/) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | [Google Cloud Console](https://console.cloud.google.com/) |
| `NEXT_PUBLIC_APP_URL` | Public app URL | Your domain |
| `CRON_SECRET` | Secret for cron jobs (production) | `openssl rand -base64 32` |

---

## 🧪 Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npx prisma migrate dev   # Create and apply migrations
npx prisma generate      # Generate Prisma Client
npx prisma studio        # Open Prisma Studio (database GUI)
npx prisma db seed       # Seed database with test data

# Testing
npm run test             # Run tests (when implemented)
npm run test:e2e         # Run E2E tests (when implemented)
```

### Database Management

**Create a migration:**
```bash
npx prisma migrate dev --name your_migration_name
```

**Reset database (⚠️ destructive):**
```bash
npx prisma migrate reset
```

**View database with Prisma Studio:**
```bash
npx prisma studio
# Opens at http://localhost:5555
```

### Code Quality

**Format code:**
```bash
npm run format           # Format with Prettier
```

**Lint code:**
```bash
npm run lint             # Check with ESLint
npm run lint:fix         # Auto-fix issues
```

---

## 📊 Database Schema

The database uses PostgreSQL with Prisma ORM. Key entities:

- **User** - User accounts, credits, subscription tiers
- **Review** - Customer reviews with sentiment
- **ReviewResponse** - AI-generated responses
- **ResponseVersion** - Response history (for regenerations)
- **BrandVoice** - User's brand voice settings
- **CreditUsage** - Credit transaction log (fraud prevention)
- **SentimentUsage** - Sentiment analysis log (fraud prevention)

See [04_DATA_MODEL.md](docs/phase-0/04_DATA_MODEL.md) for complete schema.

---

## 🌐 API Documentation

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Sign in
- `POST /api/auth/logout` - Sign out
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Reviews
- `GET /api/reviews` - List reviews (with filters)
- `POST /api/reviews` - Create review
- `GET /api/reviews/[id]` - Get single review
- `PUT /api/reviews/[id]` - Update review
- `DELETE /api/reviews/[id]` - Delete review

### Responses
- `POST /api/responses/generate` - Generate AI response
- `POST /api/responses/[id]/regenerate` - Regenerate response
- `PUT /api/responses/[id]` - Edit response
- `POST /api/responses/[id]/approve` - Approve response

### Brand Voice
- `GET /api/brand-voice` - Get brand voice settings
- `PUT /api/brand-voice` - Update brand voice settings

### Credits
- `GET /api/credits` - Get credit balance and usage
- `GET /api/credits/history` - Get credit usage history

### Sentiment Analysis
- `POST /api/sentiment/analyze` - Manually analyze sentiment
- `POST /api/sentiment/batch` - Batch analyze reviews

See [05_API_CONTRACTS.md](docs/phase-0/05_API_CONTRACTS.md) for complete API documentation.

---

## 🚢 Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Import to Vercel**
   - Visit [vercel.com/new](https://vercel.com/new)
   - Import your repository
   - Configure environment variables
   - Deploy

3. **Set up Database**
   - Run migrations on production database:
   ```bash
   DATABASE_URL="postgresql://..." npx prisma migrate deploy
   ```

4. **Configure Cron Jobs**
   - Add `vercel.json`:
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/reset-credits",
         "schedule": "0 0 1 * *"
       },
       {
         "path": "/api/cron/reset-sentiment-quota",
         "schedule": "0 0 1 * *"
       }
     ]
   }
   ```

### Environment Variables for Production

Add all required environment variables in Vercel dashboard:
- Database connection string (production)
- API keys (production values)
- NEXTAUTH_URL (your production domain)
- NEXTAUTH_SECRET (generate new one)
- CRON_SECRET (for cron job security)

---

## 🔒 Security

- **Authentication:** Secure session management with NextAuth.js
- **Password Hashing:** bcrypt with cost factor 12
- **SQL Injection:** Protected by Prisma ORM
- **XSS:** React automatically escapes content
- **CSRF:** NextAuth.js handles CSRF tokens
- **Rate Limiting:** Implemented on sensitive endpoints
- **API Keys:** Never exposed to client, stored in environment variables
- **Audit Trails:** All credit and sentiment usage logged permanently

See [06_SECURITY_PRIVACY.md](docs/phase-0/06_SECURITY_PRIVACY.md) for complete security documentation.

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices (strict mode)
- Write meaningful commit messages
- Add tests for new features (when testing is set up)
- Update documentation for significant changes
- Follow the existing code style

---

## 📞 Support

- **Documentation:** Check `docs/` folder first
- **Issues:** [GitHub Issues](https://github.com/yourusername/brandsiq/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/brandsiq/discussions)

---

## 🗺 Roadmap

### ✅ Phase 0: Documentation (Complete)
- Product specifications
- Technical architecture
- Implementation guides

### 🚧 Phase 1: Core MVP (Current - Week 1-2)
- Authentication system
- Manual review input
- AI response generation
- Brand voice customization
- Credit system
- Sentiment analysis

### ⏳ Phase 2: CSV Import (Week 3)
- Bulk upload functionality
- Format auto-detection
- Batch processing
- Export capabilities

### ⏳ Phase 3: Platform Integrations (Week 4+)
- Google Business Profile integration
- Shopify integration
- Amazon integration
- Auto-sync and one-click posting

### 🔮 Future Enhancements
- Team collaboration features
- Advanced analytics dashboard
- Review solicitation
- Review widgets
- Mobile app
- White-label solution

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework for production
- [Anthropic](https://www.anthropic.com/) - Claude AI API
- [Vercel](https://vercel.com/) - Hosting and deployment
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components
- [Prisma](https://www.prisma.io/) - Next-generation ORM

---

## 📈 Project Status

**Current Phase:** Phase 1 MVP Development  
**Last Updated:** January 7, 2026  
**Status:** 🟢 Active Development

---

<div align="center">

**Built with ❤️ using AI-assisted development**

[Documentation](docs/) • [Implementation Guide](IMPLEMENTATION.md) • [Report Bug](https://github.com/yourusername/brandsiq/issues) • [Request Feature](https://github.com/yourusername/brandsiq/issues)

</div>

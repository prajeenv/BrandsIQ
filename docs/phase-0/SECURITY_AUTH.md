# BrandsIQ: Security & Authentication (Condensed)
**Version:** 1.0 | **Phase:** MVP | **Focus:** NextAuth.js, Security, GDPR

---

## NextAuth.js Setup

### Installation
```bash
npm install next-auth@beta bcryptjs @prisma/client resend
npm install -D @types/bcryptjs
```

### Environment Variables
```bash
# .env.local
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<generate with: openssl rand -base64 32>"
DATABASE_URL="postgresql://user:password@host:5432/brandsiq"
RESEND_API_KEY="re_..."
GOOGLE_CLIENT_ID="123456789-abcdefg.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-abc123def456"

# Claude AI
ANTHROPIC_API_KEY="sk-ant-api03-..."

# DeepSeek
DEEPSEEK_API_KEY="sk-..."
```

---

## NextAuth Configuration

**File:** `app/api/auth/[...nextauth]/route.ts`

```typescript
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  providers: [
    // Email/Password
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });
        
        if (!user || !user.password) {
          throw new Error("Invalid credentials");
        }
        
        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error("Invalid credentials");
        }
        
        if (!user.emailVerified) {
          throw new Error("Please verify your email before logging in");
        }
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          tier: user.tier,
        };
      }
    }),
    
    // Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile",
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    })
  ],
  
  callbacks: {
    async signIn({ user, account }) {
      // OAuth users have pre-verified email
      if (account?.provider === "google") {
        await prisma.user.update({
          where: { email: user.email! },
          data: { emailVerified: new Date() }
        });
      }
      return true;
    },
    
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.tier = user.tier;
      }
      
      if (trigger === "update" && session) {
        token.tier = session.tier;
        token.name = session.name;
      }
      
      return token;
    },
    
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.tier = token.tier as string;
      }
      return session;
    }
  },
  
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
    newUser: "/onboarding"
  },
  
  events: {
    async signIn({ user, isNewUser }) {
      if (isNewUser) {
        // Initialize new user
        await prisma.user.update({
          where: { id: user.id },
          data: {
            credits: 15,
            tier: "FREE",
            sentimentQuota: 35,
            sentimentUsed: 0
          }
        });
        
        // Create default brand voice
        await prisma.brandVoice.create({
          data: {
            userId: user.id,
            tone: "professional",
            formality: 3,
            keyPhrases: ["Thank you", "We appreciate your feedback"],
            styleNotes: "Be genuine and empathetic"
          }
        });
      }
    }
  },
  
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

---

## Protected Routes Middleware

**File:** `middleware.ts`

```typescript
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Additional checks if needed
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/reviews/:path*",
    "/settings/:path*",
    "/api/reviews/:path*",
    "/api/brand-voice/:path*",
    "/api/credits/:path*",
  ],
};
```

---

## Email Verification

**File:** `lib/email.ts`

```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}`;
  
  await resend.emails.send({
    from: "BrandsIQ <noreply@brandsiq.app>",
    to: email,
    subject: "Verify your email address",
    html: `
      <h1>Welcome to BrandsIQ!</h1>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${verificationUrl}">Verify Email</a>
      <p>This link expires in 24 hours.</p>
    `
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;
  
  await resend.emails.send({
    from: "BrandsIQ <noreply@brandsiq.app>",
    to: email,
    subject: "Reset your password",
    html: `
      <h1>Password Reset Request</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link expires in 1 hour.</p>
    `
  });
}
```

---

## Security Implementation

### Password Hashing
```typescript
import bcrypt from "bcryptjs";

// Hash password on signup
const hashedPassword = await bcrypt.hash(password, 12);

// Verify password on login
const isValid = await bcrypt.compare(password, user.password);
```

### CSRF Protection
- NextAuth.js handles CSRF automatically via tokens
- Double-submit cookie pattern for custom API routes
- SameSite cookies: `Lax` for session, `Strict` for sensitive actions

### Rate Limiting

**File:** `lib/rate-limit.ts`

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Login rate limit: 5 attempts per 15 minutes
export const loginRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
});

// API rate limit: 100 requests per minute
export const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"),
});

// AI generation rate limit: 10 per minute (prevent abuse)
export const aiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
});
```

**Usage in API route:**
```typescript
import { apiRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const { success } = await apiRateLimit.limit(ip);
  
  if (!success) {
    return NextResponse.json(
      { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests" } },
      { status: 429 }
    );
  }
  
  // Continue with request...
}
```

### XSS Prevention
- All user input sanitized before storage
- React escapes output by default
- CSP headers set in Next.js config

**File:** `next.config.js`

```javascript
module.exports = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
          },
          {
            key: "X-Frame-Options",
            value: "DENY"
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin"
          }
        ]
      }
    ];
  }
};
```

### SQL Injection Prevention
- Prisma ORM uses parameterized queries automatically
- Never use raw SQL unless absolutely necessary
- If raw SQL needed, use Prisma's `$queryRaw` with parameters

---

## GDPR Compliance

### Right to Access (Data Export)

**File:** `app/api/user/data-export/route.ts`

```typescript
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return unauthorized();
  
  const userId = session.user.id;
  
  // Fetch all user data
  const userData = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      reviews: {
        include: { response: true }
      },
      brandVoice: true,
      creditUsage: true,
      sentimentUsage: true
    }
  });
  
  // Return as JSON download
  return NextResponse.json(userData, {
    headers: {
      "Content-Disposition": `attachment; filename="brandsiq-data-${userId}.json"`,
      "Content-Type": "application/json"
    }
  });
}
```

### Right to Erasure (Account Deletion)

**File:** `app/api/user/account/route.ts`

```typescript
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return unauthorized();
  
  const { password, confirm } = await req.json();
  
  // Verify password
  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  });
  
  if (user?.password) {
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: { code: "INVALID_PASSWORD", message: "Password is incorrect" } },
        { status: 401 }
      );
    }
  }
  
  if (!confirm) {
    return NextResponse.json(
      { error: { code: "CONFIRMATION_REQUIRED", message: "You must confirm deletion" } },
      { status: 400 }
    );
  }
  
  // Anonymize audit trails before deletion
  await anonymizeAuditTrails(session.user.id);
  
  // Delete user (cascades to most relations)
  await prisma.user.delete({
    where: { id: session.user.id }
  });
  
  return NextResponse.json({
    success: true,
    data: { message: "Account deleted successfully" }
  });
}

async function anonymizeAuditTrails(userId: string) {
  // Anonymize credit usage audit trail
  await prisma.creditUsage.updateMany({
    where: { userId },
    data: {
      details: JSON.stringify({
        anonymized: true,
        deletedAt: new Date(),
        // Remove PII, keep structure for auditing
      })
    }
  });
  
  // Anonymize sentiment usage audit trail
  await prisma.sentimentUsage.updateMany({
    where: { userId },
    data: {
      details: JSON.stringify({
        anonymized: true,
        deletedAt: new Date(),
      })
    }
  });
}
```

### Data Retention Policy
- Active users: Data retained indefinitely
- Deleted accounts: PII removed immediately, anonymized audit trails kept for 90 days
- Inactive accounts (2+ years no login): Email notification → 30 days to respond → deletion

### Privacy by Design
- Collect only necessary data
- Default privacy settings: most restrictive
- Clear consent for data processing
- Transparent data usage in privacy policy
- Regular security audits

---

## Fraud Prevention

### Credit System Protection
```typescript
// Atomic credit deduction with transaction
async function deductCredits(userId: string, amount: number, action: string) {
  return await prisma.$transaction(async (tx) => {
    // Lock user row to prevent race conditions
    const user = await tx.user.findUnique({
      where: { id: userId }
    });
    
    if (!user || user.credits < amount) {
      throw new Error("INSUFFICIENT_CREDITS");
    }
    
    // Deduct credits
    await tx.user.update({
      where: { id: userId },
      data: { credits: { decrement: amount } }
    });
    
    // Log usage (audit trail)
    await tx.creditUsage.create({
      data: {
        userId,
        creditsUsed: amount,
        action,
      }
    });
    
    return { success: true, creditsRemaining: user.credits - amount };
  });
}
```

### Suspicious Activity Detection
- Monitor: Rapid API calls, unusual usage patterns, multiple failed auth attempts
- Response: Temporary rate limiting, account review, CAPTCHA challenge
- Logging: All suspicious activity logged for manual review

---

## Security Checklist

**Before Launch:**
- [ ] NEXTAUTH_SECRET is strong random value (32+ bytes)
- [ ] HTTPS enforced in production
- [ ] Rate limiting configured for all sensitive endpoints
- [ ] CSRF tokens verified on state-changing operations
- [ ] Password requirements enforced (min 8 chars)
- [ ] Email verification required before access
- [ ] SQL injection: Prisma parameterized queries used
- [ ] XSS protection: CSP headers set, React escaping active
- [ ] Sensitive data encrypted at rest (database encryption)
- [ ] API keys stored in environment variables, never committed
- [ ] GDPR compliance: data export + deletion implemented
- [ ] Audit trails for credit/sentiment usage
- [ ] Session timeout: 30 days max
- [ ] Failed login lockout: 5 attempts = 15 min cooldown

**Ongoing:**
- [ ] Regular dependency updates (npm audit)
- [ ] Security headers reviewed quarterly
- [ ] Incident response plan documented
- [ ] Backup strategy: Daily automated backups
- [ ] Monitoring: Error tracking (Sentry), uptime monitoring

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { SESSION_CONFIG, BETA_PLAN, TIER_LIMITS } from "./constants";
import { getCurrentPhase } from "./system-phase";
import { isFounderEmail } from "./auth-helpers";

const INVITE_COOKIE_NAME = "bx_invite_code";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),

  // Trust the X-Forwarded-Host header set by Vercel's edge proxy.
  // Required for auth to work across Vercel domain aliases (preview URLs,
  // custom domains, etc.) without explicitly configuring AUTH_URL per host.
  trustHost: true,

  session: {
    strategy: "jwt",
    maxAge: SESSION_CONFIG.MAX_AGE_DAYS * 24 * 60 * 60, // 30 days
    updateAge: SESSION_CONFIG.UPDATE_AGE_DAYS * 24 * 60 * 60, // 1 day
  },

  providers: [
    // Email/Password Provider
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = (credentials.email as string).toLowerCase().trim();
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          return null;
        }

        if (!user.password) {
          // OAuth only account - no password set
          return null;
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return null;
        }

        if (!user.emailVerified) {
          throw new Error("Please verify your email before logging in");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          tier: user.tier,
          // Surfaced so the jwt callback can stash it on the session for
          // PostHog identification (PostHogSessionSync reads it).
          // isBetaUser changes very rarely (founder-granted) so JWT-staleness
          // isn't an issue here — the next sign-in picks up any change.
          isBetaUser: user.isBetaUser,
        };
      },
    }),

    // Google OAuth Provider
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: "openid email profile",
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Google OAuth sign-in
      if (account?.provider === "google" && user.email) {
        // Check if user already exists with this email
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { accounts: true },
        });

        if (existingUser) {
          // Check if Google account is already linked
          const googleAccountLinked = existingUser.accounts.some(
            (acc) => acc.provider === "google"
          );

          if (!googleAccountLinked) {
            // Link the Google account to the existing user
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
              },
            });
          }

          // Update emailVerified if not already verified
          if (!existingUser.emailVerified) {
            await prisma.user.update({
              where: { email: user.email },
              data: { emailVerified: new Date() },
            });
          }

          // Update user info from Google profile if available
          if (profile) {
            await prisma.user.update({
              where: { email: user.email },
              data: {
                name: existingUser.name || profile.name,
                image: existingUser.image || (profile as { picture?: string }).picture,
              },
            });
          }
        }
      }
      return true;
    },

    async jwt({ token, user, account }) {
      // Initial sign in - user object is available
      if (user) {
        token.id = user.id;
        token.tier = (user as { tier?: string }).tier || "FREE";
        token.isBetaUser =
          (user as { isBetaUser?: boolean }).isBetaUser ?? false;
      }

      // For OAuth, fetch the latest user data from database
      if (account?.provider === "google" && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true, tier: true, isBetaUser: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.tier = dbUser.tier || "FREE";
          token.isBetaUser = dbUser.isBetaUser;
        }
      }

      // Compute isFounder server-side from FOUNDER_EMAILS so client components
      // (Sidebar etc.) don't need to read the env var. Recomputed on every JWT
      // pass — cheap (in-memory string compare); picks up env-var changes after
      // the user signs out/in (acceptable for a one-founder MVP).
      token.isFounder = isFounderEmail(token.email);

      return token;
    },

    async session({ session, token }) {
      // Transfer token data to session
      if (session.user) {
        session.user.id = token.id as string;
        session.user.tier = (token.tier as string) || "FREE";
        session.user.isFounder = token.isFounder ?? false;
        session.user.isBetaUser = token.isBetaUser ?? false;
      }
      return session;
    },
  },

  events: {
    async signIn({ user, isNewUser }) {
      if (!isNewUser || !user.id) return;

      // Calculate reset date as 30 days from now (anniversary-based billing)
      const resetDate = new Date();
      resetDate.setUTCDate(resetDate.getUTCDate() + 30);
      resetDate.setUTCHours(0, 0, 0, 0);

      // OAuth signups can carry a beta invite code through a short-lived
      // HttpOnly cookie set by /api/auth/stash-invite before the OAuth
      // redirect. See MVP.md Section 13.2.
      //
      // The phase flag short-circuits this in phase_2: invite codes are
      // ignored at commercial launch (existing links are still defensively
      // rejected via the validity check below).
      let isBetaUser = false;
      let appliedCode: string | null = null;

      if (getCurrentPhase() === "phase_1") {
        try {
          const cookieStore = await cookies();
          const inviteCookie = cookieStore.get(INVITE_COOKIE_NAME);

          if (inviteCookie?.value) {
            const invite = await prisma.betaInviteLink.findUnique({
              where: { code: inviteCookie.value },
              select: { code: true, expiresAt: true, usedAt: true },
            });

            const now = new Date();
            if (invite && !invite.usedAt && invite.expiresAt >= now) {
              isBetaUser = true;
              appliedCode = invite.code;
            }
          }
        } catch (error) {
          // Reading cookies can fail in some edge runtime contexts; treat as
          // no-cookie. The user will be created as Free — visible failure
          // mode rather than a silent crash.
          console.error("[auth.events.signIn] failed to read invite cookie:", error);
        }
      }

      const allocation = isBetaUser
        ? { credits: BETA_PLAN.credits, sentimentQuota: BETA_PLAN.sentimentQuota }
        : { credits: TIER_LIMITS.FREE.credits, sentimentQuota: TIER_LIMITS.FREE.sentimentQuota };

      // Apply allocation, mark invite used (if any), create default brand
      // voice — all atomically so the user can't end up half-initialized.
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id! },
          data: {
            credits: allocation.credits,
            tier: "FREE",
            isBetaUser,
            sentimentCredits: allocation.sentimentQuota,
            creditsResetDate: resetDate,
            sentimentResetDate: resetDate,
          },
        });

        await tx.brandVoice.create({
          data: {
            userId: user.id!,
            tone: "professional",
            formality: 3,
            keyPhrases: ["Thank you", "We appreciate your feedback"],
            styleNotes: "Be genuine and empathetic",
          },
        });

        if (appliedCode) {
          await tx.betaInviteLink.update({
            where: { code: appliedCode },
            data: {
              usedAt: new Date(),
              usedByUserId: user.id!,
            },
          });
        }
      });

      // Best-effort cookie cleanup (don't crash signup if it fails)
      try {
        const cookieStore = await cookies();
        cookieStore.delete(INVITE_COOKIE_NAME);
      } catch {
        // ignore
      }
    },
  },

  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
    newUser: "/onboarding",
  },

  debug: process.env.NODE_ENV === "development",
});

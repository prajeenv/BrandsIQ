import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { SESSION_CONFIG } from "./constants";

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
      }

      // For OAuth, fetch the latest user data from database
      if (account?.provider === "google" && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true, tier: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.tier = dbUser.tier || "FREE";
        }
      }

      return token;
    },

    async session({ session, token }) {
      // Transfer token data to session
      if (session.user) {
        session.user.id = token.id as string;
        session.user.tier = (token.tier as string) || "FREE";
      }
      return session;
    },
  },

  events: {
    async signIn({ user, isNewUser }) {
      if (isNewUser && user.id) {
        // Calculate reset date as 30 days from now (anniversary-based billing)
        const resetDate = new Date();
        resetDate.setUTCDate(resetDate.getUTCDate() + 30);
        resetDate.setUTCHours(0, 0, 0, 0);

        // Initialize new user with default values
        await prisma.user.update({
          where: { id: user.id },
          data: {
            credits: 15,
            tier: "FREE",
            sentimentCredits: 35,
            creditsResetDate: resetDate,
            sentimentResetDate: resetDate,
          },
        });

        // Create default brand voice
        await prisma.brandVoice.create({
          data: {
            userId: user.id,
            tone: "professional",
            formality: 3,
            keyPhrases: ["Thank you", "We appreciate your feedback"],
            styleNotes: "Be genuine and empathetic",
          },
        });
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

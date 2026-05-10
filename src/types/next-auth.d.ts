/* eslint-disable no-unused-vars */
import type { DefaultSession, DefaultUser } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      tier: string;
      // Computed in the JWT callback from FOUNDER_EMAILS (server-only env var).
      // Exposed on the session so client components like Sidebar can render
      // founder-only UI without needing to read FOUNDER_EMAILS in the browser.
      isFounder: boolean;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    tier?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    tier?: string;
    isFounder?: boolean;
  }
}

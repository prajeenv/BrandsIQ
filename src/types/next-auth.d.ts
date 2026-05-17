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
      // Reflects User.isBetaUser at sign-in time. Used by PostHogSessionSync
      // to attach the beta flag to the PostHog Person record so dashboards
      // can filter cohorts by beta status. The value is fixed for the
      // session — isBetaUser changes very rarely (founder-granted) so the
      // next sign-in picks up any change. Real-time per-route value is on
      // CreditsProvider for downstream UI.
      isBetaUser: boolean;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    tier?: string;
    isBetaUser?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    tier?: string;
    isFounder?: boolean;
    isBetaUser?: boolean;
  }
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Check, MessageCircle } from "lucide-react";
import { LOGO_RATIO } from "@/lib/constants";

// Contact details surfaced on this page, kept as single constants.
const WHATSAPP_URL = "https://wa.me/491776910899";
const FOUNDER_EMAIL = "prajeen@brandsiq.app";

// Carry the walk-in source forward so signup attribution works without any
// pre-consent page analytics — the existing signup flow reads utm_source and
// stamps it onto the signup_completed_* PostHog event (a post-opt-in action).
const SIGNUP_HREF = "/auth/signup?utm_source=walkin";

export const metadata: Metadata = {
  title: "Try BrandsIQ, AI review replies for hospitality",
  description:
    "Reply to your reviews in seconds, in your brand voice. AI review replies for hospitality, retail, and local businesses. Built in Berlin.",
};

const VALUE_POINTS = [
  "Drafts in your brand voice in 5 seconds",
  "Multilingual: German, English, French, Italian, and 35 more",
  "GDPR-native, EU-hosted",
  "Free during beta, no card needed",
];

const HOW_IT_WORKS = [
  {
    title: "Set up your tone",
    body: "Tell us how you write in 3 questions (takes 2 minutes).",
  },
  {
    title: "Paste a review",
    body: "Copy from Google, TripAdvisor, or anywhere else.",
  },
  {
    title: "Get a draft in 5 seconds",
    body: "Edit if needed, post the reply on your platform.",
  },
];

const primaryButtonClass =
  "inline-flex h-12 items-center justify-center rounded-md bg-brand-500 px-6 text-base font-medium text-white hover:bg-brand-600 transition-colors";

// Outlined brand button: visible indigo border, used for the founder-block
// contact pair (WhatsApp + Email) so they read as a balanced, equal-weight
// pair rather than solid-vs-faint-grey.
const outlineButtonClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-md border border-brand-500 bg-background px-6 text-base font-medium text-brand-600 hover:bg-brand-50 transition-colors";

// min-h-[44px] keeps the tappable area at the 44px touch-target floor (spec
// §7) while preserving the plain text-link look.
const secondaryLinkClass =
  "inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-brand-600 underline-offset-4 hover:underline";

export default function WalkinPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col px-5">
        {/* Logo. Small + centered, not a link: there's nowhere more "home" to
            send a just-met walk-in visitor, and a link would risk pulling them
            off the conversion path. */}
        <div className="flex justify-center pt-10 pb-2">
          <Image
            src="/logo.png"
            alt="BrandsIQ"
            height={28}
            width={Math.round(28 * LOGO_RATIO)}
            priority
            className="h-7 w-auto"
          />
        </div>

        {/* Hero */}
        <section className="flex flex-col gap-5 pt-6 pb-12 text-center">
          <h1 className="text-[2rem] font-semibold leading-tight tracking-tight sm:text-5xl">
            Reply to your reviews in seconds, in your brand voice.
          </h1>
          <p className="text-lg text-muted-foreground">
            AI review replies for hospitality, retail, and local businesses.
            Built in Berlin.
          </p>
          <div className="flex flex-col items-center gap-3">
            <Link href={SIGNUP_HREF} className={primaryButtonClass}>
              Start free beta
            </Link>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={secondaryLinkClass}
            >
              <MessageCircle aria-hidden="true" className="h-4 w-4" />
              WhatsApp me directly
            </a>
          </div>
        </section>

        {/* Welcome line */}
        <section className="border-t py-10">
          <p className="text-lg text-foreground">
            Thanks for talking with me today. Here&apos;s what BrandsIQ does, and
            how to try it on your own reviews.
          </p>
        </section>

        {/* Value points */}
        <section className="border-t py-10">
          <ul className="flex flex-col gap-4">
            {VALUE_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600"
                >
                  <Check className="h-4 w-4" />
                </span>
                <span className="text-base text-foreground">{point}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* How it works */}
        <section className="border-t py-10">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight">
            How it works
          </h2>
          <ol className="flex flex-col gap-6">
            {HOW_IT_WORKS.map((step, index) => (
              <li key={step.title} className="flex items-start gap-4">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white"
                >
                  {index + 1}
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="text-base font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-base text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Founder */}
        <section className="border-t py-10">
          <div className="flex flex-col items-center gap-4 text-center">
            <span
              aria-hidden="true"
              className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-3xl font-medium text-brand-600"
            >
              P
            </span>
            <p className="text-base font-semibold text-foreground">
              Prajeen Vijayan, Founder, Berlin
            </p>
            <p className="text-base text-muted-foreground">
              I&apos;m building this in Berlin. If you&apos;d like to chat through
              how it works on your reviews, ping me directly. Happy to set up 15
              minutes.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={outlineButtonClass}
              >
                <MessageCircle aria-hidden="true" className="h-4 w-4" />
                WhatsApp
              </a>
              <a href={`mailto:${FOUNDER_EMAIL}`} className={outlineButtonClass}>
                Email
              </a>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="border-t py-12">
          <div className="flex flex-col items-center gap-3 text-center">
            <Link href={SIGNUP_HREF} className={primaryButtonClass}>
              Start your free beta
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

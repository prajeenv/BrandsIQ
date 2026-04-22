import Link from "next/link";
import { SUPPORT_MAILTO, TIER_LIMITS } from "@/lib/constants";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 items-center justify-center rounded-lg bg-brand-500 text-white font-bold px-2 text-sm">
              IQ
            </div>
            <span className="text-xl font-bold">BrandsIQ</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/auth/signin"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex h-9 items-center justify-center rounded-md bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container flex flex-col items-center justify-center gap-8 py-24 text-center">
          <div className="flex flex-col gap-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Respond to Reviews
              <br />
              <span className="text-brand-500">10x Faster</span>
            </h1>
            <p className="mx-auto max-w-[700px] text-lg text-muted-foreground sm:text-xl">
              AI-powered review response management for SMBs. Generate
              brand-aligned responses in 40+ languages. Save 10+ hours per week.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/auth/signup"
              className="inline-flex h-11 items-center justify-center rounded-md bg-brand-500 px-8 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
            >
              Start Free Trial
            </Link>
            <Link
              href="#features"
              className="inline-flex h-11 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Learn More
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="container py-24">
          <div className="mx-auto flex max-w-[800px] flex-col items-center gap-4 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to manage reviews
            </h2>
            <p className="text-lg text-muted-foreground">
              From sentiment analysis to brand-voice responses, we&apos;ve got
              you covered.
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-5xl gap-8 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="flex flex-col gap-4 rounded-lg border p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold">AI-Powered Responses</h3>
              <p className="text-muted-foreground">
                Generate professional, brand-aligned responses in seconds using
                Claude AI.
              </p>
            </div>
            {/* Feature 2 */}
            <div className="flex flex-col gap-4 rounded-lg border p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold">40+ Languages</h3>
              <p className="text-muted-foreground">
                Native-quality responses in any language. Auto-detect review
                language.
              </p>
            </div>
            {/* Feature 3 */}
            <div className="flex flex-col gap-4 rounded-lg border p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold">Sentiment Analysis</h3>
              <p className="text-muted-foreground">
                Automatically categorize reviews as positive, neutral, or
                negative.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Preview */}
        <section className="container py-24 bg-muted/50">
          <div className="mx-auto flex max-w-[800px] flex-col items-center gap-4 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-muted-foreground">
              Start free, upgrade when you need more.
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-4xl gap-8 md:grid-cols-3">
            {/* Free Tier */}
            <div className="flex flex-col rounded-lg border bg-background p-6">
              <h3 className="text-lg font-bold">Free</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">${TIER_LIMITS.FREE.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-brand-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {TIER_LIMITS.FREE.credits} responses/month
                </li>
                <li className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-brand-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {TIER_LIMITS.FREE.sentimentQuota} sentiment analyses
                </li>
                <li className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-brand-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  All languages
                </li>
              </ul>
            </div>
            {/* Starter Tier */}
            <div className="flex flex-col rounded-lg border-2 border-brand-500 bg-background p-6 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-1 text-xs font-medium text-white">
                Popular
              </div>
              <h3 className="text-lg font-bold">Starter</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">${TIER_LIMITS.STARTER.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-brand-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {TIER_LIMITS.STARTER.credits} responses/month
                </li>
                <li className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-brand-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {TIER_LIMITS.STARTER.sentimentQuota} sentiment analyses
                </li>
                <li className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-brand-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Brand voice customization
                </li>
              </ul>
            </div>
            {/* Growth Tier */}
            <div className="flex flex-col rounded-lg border bg-background p-6">
              <h3 className="text-lg font-bold">Growth</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">${TIER_LIMITS.GROWTH.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-brand-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {TIER_LIMITS.GROWTH.credits} responses/month
                </li>
                <li className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-brand-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {TIER_LIMITS.GROWTH.sentimentQuota} sentiment analyses
                </li>
                <li className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-brand-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Priority support
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 items-center justify-center rounded bg-brand-500 text-white text-xs font-bold px-1.5">
              IQ
            </div>
            <span className="text-sm font-medium">BrandsIQ</span>
          </div>
          <div className="flex flex-col items-center gap-2 md:flex-row md:gap-6">
            <a
              href={SUPPORT_MAILTO}
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              Contact support
            </a>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} BrandsIQ. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import { SessionProvider, PostHogProvider } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BrandsIQ - AI-Powered Review Response Management",
    template: "%s | BrandsIQ",
  },
  description:
    "Save 10+ hours per week responding to customer reviews with AI-powered, brand-aligned responses in 40+ languages.",
  keywords: [
    "review management",
    "AI responses",
    "customer reviews",
    "brand voice",
    "multi-language",
  ],
  authors: [{ name: "BrandsIQ" }],
  creator: "BrandsIQ",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL,
    title: "BrandsIQ - AI-Powered Review Response Management",
    description:
      "Save 10+ hours per week responding to customer reviews with AI-powered, brand-aligned responses in 40+ languages.",
    siteName: "BrandsIQ",
  },
  twitter: {
    card: "summary_large_image",
    title: "BrandsIQ - AI-Powered Review Response Management",
    description:
      "Save 10+ hours per week responding to customer reviews with AI-powered, brand-aligned responses in 40+ languages.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <PostHogProvider>
          <SessionProvider>
            {children}
            <Toaster position="top-right" richColors closeButton />
          </SessionProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}

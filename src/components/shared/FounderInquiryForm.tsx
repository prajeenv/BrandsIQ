"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail, User, Briefcase, MessageSquare, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createFounderInquirySchema, type CreateFounderInquiryInput } from "@/lib/validations";
import type { FounderInquiryType, FounderInquirySource } from "@/lib/constants";
import { trackFounderInquirySubmitted } from "@/lib/posthog-events";

/**
 * Shared founder-inquiry form. Used in four places per MVP.md Section 13.4:
 *  - /auth/beta-link-expired — unauthenticated; requires submitter contact
 *  - "Request beta access" CTA on /pricing — auth state varies
 *  - "Request beta access" or "Request more credits" CTA on the zero-balance
 *    dialog — authenticated; session info backfills missing fields
 *  - (Iteration 3) "Get in touch" callsites
 *
 * The form's *type* and *source* are fixed by the caller (passed via props).
 * The submitter fields are pre-filled when the caller has the data — typically
 * from the session — and hidden when fully pre-filled to keep the UX clean.
 */

interface FounderInquiryFormProps {
  type: FounderInquiryType;
  source: FounderInquirySource;

  // Pre-fill submitter info. When all three are provided AND `hideSubmitterFields`
  // is true, the inputs are not rendered — useful for signed-in CTAs where we
  // already know who the user is.
  defaultName?: string | null;
  defaultEmail?: string | null;
  defaultBusinessName?: string | null;
  hideSubmitterFields?: boolean;

  // Customise copy for the specific context. Sensible defaults for each type
  // are baked in but each callsite may want to tweak.
  heading?: string;
  description?: string;
  messagePlaceholder?: string;
  submitLabel?: string;

  // Callback when submission succeeds. The dialog wrappers use this to close.
  onSuccess?: () => void;
}

// Per-type copy. The `messageLabel` is the bold field label; `messageHint` is
// the italic sub-label rendered next to it (one line). The hint primes the
// reader on what we'd like to hear without forcing a survey shape — the
// placeholder example does the heavier lifting.
const DEFAULT_COPY: Record<
  FounderInquiryType,
  {
    heading: string;
    description: string;
    messageLabel: string;
    messageHint?: string;
    messagePlaceholder: string;
    submitLabel: string;
  }
> = {
  beta_request: {
    heading: "Request beta access",
    description:
      "BrandsIQ is in closed beta. Tell us a little about your business and we'll be in touch within 24 hours.",
    messageLabel: "Tell us about your business",
    messageHint: "what you do, what's painful about reviews today",
    messagePlaceholder:
      'e.g. "I run a small bakery in Shoreditch. Responding to Google reviews takes me ~30 min a day and I usually copy-paste the same few replies."',
    submitLabel: "Request beta access",
  },
  more_credits: {
    heading: "Need more credits?",
    description:
      "Let us know what you're working on and we'll top up your beta account so you can keep going.",
    messageLabel: "Message",
    messageHint: "what are you working on?",
    messagePlaceholder:
      'e.g. "I\'m running a campaign next week and want to respond to 50 reviews."',
    submitLabel: "Send request",
  },
  general: {
    heading: "Get in touch",
    description: "We'd love to hear from you — leave a note below and we'll reply.",
    messageLabel: "Message",
    messagePlaceholder: "How can we help?",
    submitLabel: "Send",
  },
  expired_link_recovery: {
    heading: "Request a fresh invite",
    description:
      "Your beta invite link has expired or has already been used. Fill in the form below and we'll send a fresh invite within 24 hours.",
    messageLabel: "Tell us about your business",
    messageHint: "what you do, what's painful about reviews today",
    messagePlaceholder:
      'e.g. "I run a small bakery in Shoreditch. Responding to Google reviews takes me ~30 min a day and I usually copy-paste the same few replies."',
    submitLabel: "Request fresh invite",
  },
};

export function FounderInquiryForm({
  type,
  source,
  defaultName,
  defaultEmail,
  defaultBusinessName,
  hideSubmitterFields = false,
  heading,
  description,
  messagePlaceholder,
  submitLabel,
  onSuccess,
}: FounderInquiryFormProps) {
  const copy = DEFAULT_COPY[type];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateFounderInquiryInput>({
    resolver: zodResolver(createFounderInquirySchema),
    defaultValues: {
      type,
      source,
      submitterName: defaultName ?? "",
      submitterEmail: defaultEmail ?? "",
      businessName: defaultBusinessName ?? "",
      message: "",
    },
  });

  const onSubmit = async (data: CreateFounderInquiryInput) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/founder-inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          source,
          submitterName: data.submitterName?.trim() || null,
          submitterEmail: data.submitterEmail?.trim() || null,
          businessName: data.businessName?.trim() || null,
          message: data.message.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message ?? "Failed to send. Please try again.");
        return;
      }

      // PostHog: inquiry funnel. The categorical type + source pair lets
      // us answer "where do most beta requests come from?" in dashboards.
      // Defaults to "other" if no source was provided by the caller —
      // some embed contexts (e.g. a future general-help surface) may omit
      // it.
      trackFounderInquirySubmitted({
        type,
        source: source ?? "other",
      });

      setSuccess(true);
      onSuccess?.();
    } catch {
      setError("Failed to send. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-3 text-center py-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
          <Check className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold">Thanks — we&apos;ll be in touch.</h3>
        <p className="text-sm text-muted-foreground">
          We aim to reply within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{heading ?? copy.heading}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {description ?? copy.description}
        </p>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {!hideSubmitterFields && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="founder-inquiry-name">Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="founder-inquiry-name"
                  type="text"
                  placeholder="Your name"
                  className="pl-10"
                  disabled={isSubmitting}
                  {...register("submitterName")}
                />
              </div>
              {errors.submitterName && (
                <p className="text-xs text-red-600">{errors.submitterName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="founder-inquiry-email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="founder-inquiry-email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-10"
                  disabled={isSubmitting}
                  {...register("submitterEmail")}
                />
              </div>
              {errors.submitterEmail && (
                <p className="text-xs text-red-600">{errors.submitterEmail.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="founder-inquiry-business">Business name</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="founder-inquiry-business"
                  type="text"
                  placeholder="e.g. Cafe Arabica"
                  className="pl-10"
                  disabled={isSubmitting}
                  {...register("businessName")}
                />
              </div>
              {errors.businessName && (
                <p className="text-xs text-red-600">{errors.businessName.message}</p>
              )}
            </div>
          </>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="founder-inquiry-message" className="flex flex-wrap items-baseline gap-x-1.5">
            <span>
              {copy.messageLabel} <span className="text-red-600">*</span>
            </span>
            {copy.messageHint && (
              <span className="text-xs italic text-muted-foreground font-normal">
                ({copy.messageHint})
              </span>
            )}
          </Label>
          <div className="relative">
            <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Textarea
              id="founder-inquiry-message"
              placeholder={messagePlaceholder ?? copy.messagePlaceholder}
              className="pl-10 min-h-[110px]"
              disabled={isSubmitting}
              {...register("message")}
            />
          </div>
          {errors.message && (
            <p className="text-xs text-red-600">{errors.message.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            submitLabel ?? copy.submitLabel
          )}
        </Button>
      </form>
    </div>
  );
}

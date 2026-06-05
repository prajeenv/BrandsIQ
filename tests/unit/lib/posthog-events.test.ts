import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock posthog-js so we can assert exactly which event names + props are
// captured. Stubbed at the module level so all imports of posthog resolve
// to the mock — including the chain through src/lib/posthog-events.ts.
const captureMock = vi.fn();
const identifyMock = vi.fn();
const resetMock = vi.fn();

vi.mock("posthog-js", () => ({
  default: {
    capture: (...args: unknown[]) => captureMock(...args),
    identify: (...args: unknown[]) => identifyMock(...args),
    reset: (...args: unknown[]) => resetMock(...args),
  },
}));

import {
  identifyUser,
  resetUser,
  trackSignupCompletedWithBeta,
  trackSignupCompletedNoBeta,
  trackOnboardingCompleted,
  trackBetaInviteLinkUsed,
  trackFounderInquirySubmitted,
  trackZeroBalanceDialogShown,
  trackCreditBalanceLow,
  trackResponseGenerated,
  trackResponseRegenerated,
  trackSentimentAnalyzed,
} from "@/lib/posthog-events";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("posthog-events — identification", () => {
  it("identifyUser sets tier + isBetaUser, no PII", () => {
    identifyUser("user_abc", { tier: "FREE", isBetaUser: true });

    expect(identifyMock).toHaveBeenCalledTimes(1);
    expect(identifyMock).toHaveBeenCalledWith("user_abc", {
      tier: "FREE",
      isBetaUser: true,
    });

    // Defensive: confirm nothing PII-shaped leaked through. The helper
    // intentionally omits name/email/organizationName.
    const props = identifyMock.mock.calls[0][1];
    expect(props).not.toHaveProperty("name");
    expect(props).not.toHaveProperty("email");
    expect(props).not.toHaveProperty("organizationName");
  });

  it("resetUser clears the PostHog session", () => {
    resetUser();
    expect(resetMock).toHaveBeenCalledTimes(1);
  });
});

describe("posthog-events — signup + onboarding", () => {
  it("trackSignupCompletedWithBeta fires the event with no props when no source given", () => {
    trackSignupCompletedWithBeta();

    expect(captureMock).toHaveBeenCalledWith("signup_completed_with_beta", {});
  });

  it("trackSignupCompletedNoBeta fires the event with no props when no source given", () => {
    trackSignupCompletedNoBeta();

    expect(captureMock).toHaveBeenCalledWith("signup_completed_no_beta", {});
  });

  it("trackSignupCompletedWithBeta carries signupSource when provided", () => {
    trackSignupCompletedWithBeta({ signupSource: "walkin" });

    expect(captureMock).toHaveBeenCalledWith("signup_completed_with_beta", {
      signupSource: "walkin",
    });
  });

  it("trackSignupCompletedNoBeta carries signupSource when provided", () => {
    trackSignupCompletedNoBeta({ signupSource: "walkin" });

    expect(captureMock).toHaveBeenCalledWith("signup_completed_no_beta", {
      signupSource: "walkin",
    });

    // Defensive: attribution is categorical only, never PII.
    const props = captureMock.mock.calls[0][1];
    expect(props).not.toHaveProperty("email");
    expect(props).not.toHaveProperty("name");
    expect(props).not.toHaveProperty("organizationName");
  });

  it("omits signupSource when it is empty or whitespace-only", () => {
    trackSignupCompletedNoBeta({ signupSource: "   " });
    expect(captureMock).toHaveBeenLastCalledWith(
      "signup_completed_no_beta",
      {},
    );

    captureMock.mockClear();
    trackSignupCompletedNoBeta({ signupSource: "" });
    expect(captureMock).toHaveBeenLastCalledWith(
      "signup_completed_no_beta",
      {},
    );
  });

  it("trims surrounding whitespace from signupSource", () => {
    trackSignupCompletedWithBeta({ signupSource: "  walkin  " });
    expect(captureMock).toHaveBeenCalledWith("signup_completed_with_beta", {
      signupSource: "walkin",
    });
  });

  it("trackOnboardingCompleted carries categorical context only", () => {
    trackOnboardingCompleted({
      industry: "Food & Beverage",
      businessType: "Cafe / coffee shop",
      country: "United Kingdom",
    });

    expect(captureMock).toHaveBeenCalledWith("onboarding_completed", {
      industry: "Food & Beverage",
      businessType: "Cafe / coffee shop",
      country: "United Kingdom",
    });

    // Defensive: ensure organizationName never sneaks in
    const props = captureMock.mock.calls[0][1];
    expect(props).not.toHaveProperty("organizationName");
  });

  it("trackOnboardingCompleted normalises nullable props to null (not undefined)", () => {
    // industry "Other" has no cascade — businessType is null.
    trackOnboardingCompleted({
      industry: "Other",
      businessType: null,
      country: "Ireland",
    });

    expect(captureMock).toHaveBeenCalledWith("onboarding_completed", {
      industry: "Other",
      businessType: null,
      country: "Ireland",
    });
  });
});

describe("posthog-events — beta invite", () => {
  it("trackBetaInviteLinkUsed fires the event", () => {
    trackBetaInviteLinkUsed();
    expect(captureMock).toHaveBeenCalledWith("beta_invite_link_used", {});
  });
});

describe("posthog-events — founder inquiry", () => {
  it("trackFounderInquirySubmitted carries type + source", () => {
    trackFounderInquirySubmitted({
      type: "beta_request",
      source: "pricing",
    });

    expect(captureMock).toHaveBeenCalledWith("founder_inquiry_submitted", {
      type: "beta_request",
      source: "pricing",
    });
  });

  it("carries the signup_gateway source (walk-in /auth/get-started)", () => {
    trackFounderInquirySubmitted({
      type: "beta_request",
      source: "signup_gateway",
    });

    expect(captureMock).toHaveBeenCalledWith("founder_inquiry_submitted", {
      type: "beta_request",
      source: "signup_gateway",
    });
  });

  it("supports all four inquiry types", () => {
    const types = [
      "beta_request",
      "more_credits",
      "general",
      "expired_link_recovery",
    ] as const;

    for (const type of types) {
      captureMock.mockClear();
      trackFounderInquirySubmitted({ type, source: "other" });
      expect(captureMock).toHaveBeenCalledWith(
        "founder_inquiry_submitted",
        expect.objectContaining({ type }),
      );
    }
  });
});

describe("posthog-events — credit lifecycle", () => {
  it("trackZeroBalanceDialogShown carries tier + isBetaUser", () => {
    trackZeroBalanceDialogShown({ tier: "FREE", isBetaUser: false });

    expect(captureMock).toHaveBeenCalledWith("zero_balance_dialog_shown", {
      tier: "FREE",
      isBetaUser: false,
    });
  });

  it("trackCreditBalanceLow carries tier + isBetaUser", () => {
    trackCreditBalanceLow({ tier: "FREE", isBetaUser: true });

    expect(captureMock).toHaveBeenCalledWith("credit_balance_low", {
      tier: "FREE",
      isBetaUser: true,
    });
  });
});

describe("posthog-events — AI usage", () => {
  it("trackResponseGenerated carries tone", () => {
    trackResponseGenerated({ tone: "friendly" });
    expect(captureMock).toHaveBeenCalledWith("response_generated", {
      tone: "friendly",
    });
  });

  it("trackResponseRegenerated carries tone and instruction metadata (no raw text)", () => {
    trackResponseRegenerated({
      tone: "empathetic",
      hadAdditionalInstructions: true,
      instructionLength: 42,
    });
    expect(captureMock).toHaveBeenCalledWith("response_regenerated", {
      tone: "empathetic",
      hadAdditionalInstructions: true,
      instructionLength: 42,
    });
  });

  it("trackResponseRegenerated reports the false case + undefined length when no instruction was typed", () => {
    trackResponseRegenerated({
      tone: "friendly_professional",
      hadAdditionalInstructions: false,
    });
    expect(captureMock).toHaveBeenCalledWith("response_regenerated", {
      tone: "friendly_professional",
      hadAdditionalInstructions: false,
      instructionLength: undefined,
    });
  });

  it("trackSentimentAnalyzed carries sentiment classification", () => {
    trackSentimentAnalyzed({ sentiment: "positive" });
    expect(captureMock).toHaveBeenCalledWith("sentiment_analyzed", {
      sentiment: "positive",
    });
  });

  it("supports all three sentiment values", () => {
    const sentiments = ["positive", "neutral", "negative"] as const;
    for (const sentiment of sentiments) {
      captureMock.mockClear();
      trackSentimentAnalyzed({ sentiment });
      expect(captureMock).toHaveBeenCalledWith(
        "sentiment_analyzed",
        expect.objectContaining({ sentiment }),
      );
    }
  });
});

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Stub fetch — we only assert rendering, not submission flow here.
vi.stubGlobal("fetch", vi.fn());

import { FounderInquiryForm } from "@/components/shared/FounderInquiryForm";

describe("FounderInquiryForm — hybrid label + example placeholder", () => {
  it("beta_request renders the prospect-qualifying label, hint, and example placeholder", () => {
    render(<FounderInquiryForm type="beta_request" source="pricing" />);

    // Bold prompt label
    expect(screen.getByText(/tell us about your business/i)).toBeInTheDocument();
    // Italic hint sits next to the label
    expect(
      screen.getByText(/\(what you do, what's painful about reviews today\)/i),
    ).toBeInTheDocument();
    // Placeholder example — concrete narrative shape
    const messageField = screen.getByLabelText(
      /tell us about your business/i,
    ) as HTMLTextAreaElement;
    expect(messageField).toBeInTheDocument();
    expect(messageField.placeholder).toContain("bakery in Shoreditch");
    expect(messageField.placeholder).toContain("Google reviews");
    // The old filler should not have crept back in
    expect(messageField.placeholder).not.toContain("Would love to try BrandsIQ");
    // The old volume question should not appear anywhere on the form
    expect(
      screen.queryByText(/how many reviews are you handling/i),
    ).not.toBeInTheDocument();
  });

  it("expired_link_recovery uses the same prospect-qualifying copy as beta_request", () => {
    render(<FounderInquiryForm type="expired_link_recovery" source="expired_link" />);

    expect(screen.getByText(/tell us about your business/i)).toBeInTheDocument();
    expect(
      screen.getByText(/\(what you do, what's painful about reviews today\)/i),
    ).toBeInTheDocument();
  });

  it("more_credits keeps the simpler 'Message' label with a working-context hint", () => {
    render(<FounderInquiryForm type="more_credits" source="zero_balance" />);

    expect(screen.getByText(/\(what are you working on\?\)/i)).toBeInTheDocument();
    const messageField = screen.getByLabelText(/^message/i) as HTMLTextAreaElement;
    expect(messageField.placeholder).toContain("campaign next week");
  });

  it("general inquiry uses no hint and keeps the simplest placeholder", () => {
    render(<FounderInquiryForm type="general" source="other" />);

    // No bold beta-qualifying label
    expect(screen.queryByText(/tell us about your business/i)).not.toBeInTheDocument();
    // No italic hint
    expect(
      screen.queryByText(/\(what are you working on\?\)/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/\(what you do, what's painful about reviews today\)/i),
    ).not.toBeInTheDocument();
    const messageField = screen.getByLabelText(/^message/i) as HTMLTextAreaElement;
    expect(messageField.placeholder).toBe("How can we help?");
  });
});

describe("FounderInquiryForm — pre-fill + hideSubmitterFields", () => {
  it("renders submitter inputs by default (anonymous expired-link flow)", () => {
    render(
      <FounderInquiryForm type="expired_link_recovery" source="expired_link" />,
    );

    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/business name/i)).toBeInTheDocument();
  });

  it("hides submitter inputs when hideSubmitterFields=true (signed-in flow)", () => {
    render(
      <FounderInquiryForm
        type="more_credits"
        source="zero_balance"
        defaultName="Anita"
        defaultEmail="anita@example.com"
        defaultBusinessName="Cafe Arabica"
        hideSubmitterFields
      />,
    );

    // Submitter fields are not in the DOM at all — we don't show them and
    // then hide via CSS. Less visual noise, smaller form.
    expect(screen.queryByLabelText(/^name$/i)).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/^email/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/business name/i),
    ).not.toBeInTheDocument();

    // The message field still renders — that's the point of the form.
    expect(screen.getByLabelText(/^message/i)).toBeInTheDocument();
  });

  it("pre-fills submitter inputs when defaultName/Email/BusinessName provided but hideSubmitterFields=false", () => {
    render(
      <FounderInquiryForm
        type="beta_request"
        source="pricing"
        defaultName="Anita"
        defaultEmail="anita@example.com"
        defaultBusinessName="Cafe Arabica"
      />,
    );

    expect(
      (screen.getByLabelText(/^name$/i) as HTMLInputElement).value,
    ).toBe("Anita");
    expect((screen.getByLabelText(/email/i) as HTMLInputElement).value).toBe(
      "anita@example.com",
    );
    expect(
      (screen.getByLabelText(/business name/i) as HTMLInputElement).value,
    ).toBe("Cafe Arabica");
  });
});

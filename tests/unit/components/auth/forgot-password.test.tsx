import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// MVP Phase 1 follow-up: /auth/forgot-password is reachable for signed-in
// users now (middleware fix). When signed in, the page should pre-fill the
// email field and adjust copy so it doesn't read "forgot password?" to
// someone who's clearly already authenticated.

const useSessionMock = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: () => useSessionMock(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import ForgotPasswordPage from "@/app/(auth)/auth/forgot-password/page";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ForgotPasswordPage", () => {
  it("renders 'Forgot password?' copy + empty email field for signed-out visitors", () => {
    useSessionMock.mockReturnValue({ data: null, status: "unauthenticated" });

    render(<ForgotPasswordPage />);

    expect(screen.getByText(/forgot password\?/i)).toBeInTheDocument();
    // Description for signed-out users
    expect(screen.getByText(/enter your email and we/i)).toBeInTheDocument();

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    expect(emailInput.value).toBe("");

    // "Back to sign in" link for signed-out users
    expect(
      screen.getByRole("link", { name: /back to sign in/i }),
    ).toBeInTheDocument();
  });

  it("renders 'Reset your password' copy + pre-fills email for signed-in users", () => {
    useSessionMock.mockReturnValue({
      data: { user: { id: "u-1", email: "alice@example.com", name: "Alice" } },
      status: "authenticated",
    });

    render(<ForgotPasswordPage />);

    // Header copy adjusts for signed-in context — they haven't *forgotten*
    // their password, they're just resetting it.
    expect(screen.getByText(/reset your password/i)).toBeInTheDocument();
    expect(screen.getByText(/we'll send a reset link to your email/i)).toBeInTheDocument();

    // Email field is pre-filled from the session
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    expect(emailInput.value).toBe("alice@example.com");

    // "Back to profile settings" link instead of "Back to sign in"
    const backLink = screen.getByRole("link", {
      name: /back to profile settings/i,
    });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/dashboard/settings/profile");

    // No "Back to sign in" link
    expect(
      screen.queryByRole("link", { name: /back to sign in/i }),
    ).not.toBeInTheDocument();
  });

  it("does not pre-fill when authenticated but session has no email (defensive)", () => {
    useSessionMock.mockReturnValue({
      data: { user: { id: "u-1", email: null, name: "No Email" } },
      status: "authenticated",
    });

    render(<ForgotPasswordPage />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    expect(emailInput.value).toBe("");
  });
});

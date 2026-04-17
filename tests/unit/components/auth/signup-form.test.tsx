import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPush = vi.fn();
const mockSignIn = vi.fn();

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/auth/signup",
}));
vi.mock("next-auth/react", () => ({
  signIn: (...args: any[]) => mockSignIn(...args),
}));

import { SignupForm } from "@/components/auth/SignupForm";

describe("SignupForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("renders name, email, and password inputs", () => {
    render(<SignupForm />);

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("renders Create account button", () => {
    render(<SignupForm />);

    expect(
      screen.getByRole("button", { name: "Create account" })
    ).toBeInTheDocument();
  });

  it("renders Google OAuth button", () => {
    render(<SignupForm />);

    expect(
      screen.getByRole("button", { name: /continue with google/i })
    ).toBeInTheDocument();
  });

  it("renders Sign in link", () => {
    render(<SignupForm />);

    const link = screen.getByRole("link", { name: /sign in/i });
    expect(link).toHaveAttribute("href", "/auth/signin");
  });

  it("renders Terms and Privacy links", () => {
    render(<SignupForm />);

    expect(
      screen.getByRole("link", { name: /terms of service/i })
    ).toHaveAttribute("href", "/terms");
    expect(
      screen.getByRole("link", { name: /privacy policy/i })
    ).toHaveAttribute("href", "/privacy");
  });

  describe("password strength indicator", () => {
    it("shows password strength when typing password", () => {
      render(<SignupForm />);

      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "ab" },
      });

      expect(screen.getByText("Password strength:")).toBeInTheDocument();
      expect(screen.getByText("Weak")).toBeInTheDocument();
    });

    it('shows "Strong" for password meeting all criteria', () => {
      render(<SignupForm />);

      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "StrongPass1" },
      });

      expect(screen.getByText("Strong")).toBeInTheDocument();
    });

    it("shows password requirement checklist", () => {
      render(<SignupForm />);

      fireEvent.change(screen.getByLabelText("Password"), {
        target: { value: "test" },
      });

      expect(screen.getByText("At least 8 characters")).toBeInTheDocument();
      expect(screen.getByText("One uppercase letter")).toBeInTheDocument();
      expect(screen.getByText("One lowercase letter")).toBeInTheDocument();
      expect(screen.getByText("One number")).toBeInTheDocument();
    });
  });

  it("toggles password visibility", () => {
    render(<SignupForm />);

    const passwordInput = screen.getByLabelText("Password");
    expect(passwordInput).toHaveAttribute("type", "password");

    const toggleButtons = screen.getAllByRole("button");
    const toggleBtn = toggleButtons.find(
      (btn) => btn.querySelector("svg") && btn.closest(".relative")
    );
    expect(toggleBtn).toBeDefined();
    fireEvent.click(toggleBtn!);

    expect(passwordInput).toHaveAttribute("type", "text");
  });

  it("calls signup API on form submit", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: { message: "Account created" },
        }),
    });

    render(<SignupForm />);

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "StrongPass1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/auth/signup",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("shows success state after successful signup", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(<SignupForm />);

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "StrongPass1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(screen.getByText("Check your email")).toBeInTheDocument();
      expect(
        screen.getByText(/we've sent a verification link/i)
      ).toBeInTheDocument();
    });
  });

  it("shows error message on failed signup", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: () =>
        Promise.resolve({
          error: { message: "Email already exists" },
        }),
    });

    render(<SignupForm />);

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Test User" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "StrongPass1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(screen.getByText("Email already exists")).toBeInTheDocument();
    });
  });
});

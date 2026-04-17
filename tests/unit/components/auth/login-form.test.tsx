import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPush = vi.fn();
const mockRefresh = vi.fn();
const mockSignIn = vi.fn();

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn(), refresh: mockRefresh }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/auth/signin",
}));
vi.mock("next-auth/react", () => ({
  signIn: (...args: any[]) => mockSignIn(...args),
}));

import { LoginForm } from "@/components/auth/LoginForm";

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders email and password inputs", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("renders Sign in button", () => {
    render(<LoginForm />);

    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("renders Google OAuth button", () => {
    render(<LoginForm />);

    expect(
      screen.getByRole("button", { name: /continue with google/i })
    ).toBeInTheDocument();
  });

  it("renders Forgot password link", () => {
    render(<LoginForm />);

    const link = screen.getByRole("link", { name: /forgot password/i });
    expect(link).toHaveAttribute("href", "/auth/forgot-password");
  });

  it("renders Sign up link", () => {
    render(<LoginForm />);

    const link = screen.getByRole("link", { name: /sign up/i });
    expect(link).toHaveAttribute("href", "/auth/signup");
  });

  it("toggles password visibility on eye icon click", () => {
    render(<LoginForm />);

    const passwordInput = screen.getByLabelText("Password");
    expect(passwordInput).toHaveAttribute("type", "password");

    // Find the toggle button (visually hidden button near the password field)
    const toggleButtons = screen.getAllByRole("button");
    const toggleBtn = toggleButtons.find(
      (btn) => btn.querySelector("svg") && btn.closest(".relative")
    );
    expect(toggleBtn).toBeDefined();
    fireEvent.click(toggleBtn!);

    expect(passwordInput).toHaveAttribute("type", "text");
  });

  it("calls signIn with credentials on form submit", async () => {
    mockSignIn.mockResolvedValueOnce({ error: null });

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("credentials", {
        email: "test@example.com",
        password: "Password123",
        redirect: false,
      });
    });
  });

  it("shows error message on failed login", async () => {
    mockSignIn.mockResolvedValueOnce({ error: "CredentialsSignin" });

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(
        screen.getByText("Invalid email or password.")
      ).toBeInTheDocument();
    });
  });

  it("redirects to dashboard on successful login", async () => {
    mockSignIn.mockResolvedValueOnce({ error: null });

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("uses custom callbackUrl when provided", async () => {
    mockSignIn.mockResolvedValueOnce({ error: null });

    render(<LoginForm callbackUrl="/settings" />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/settings");
    });
  });
});

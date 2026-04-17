import { render, screen, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CreditsProvider, useCredits } from "@/components/providers/CreditsProvider";

// Test component that consumes the context
function TestConsumer() {
  const ctx = useCredits();
  return (
    <div>
      <span data-testid="credits">{ctx.credits}</span>
      <span data-testid="creditsTotal">{ctx.creditsTotal}</span>
      <span data-testid="tier">{ctx.tier}</span>
      <span data-testid="sentimentCredits">{ctx.sentimentCredits}</span>
      <button onClick={() => ctx.setCredits(5)}>Set Credits</button>
      <button onClick={() => ctx.refreshCredits()}>Refresh</button>
    </div>
  );
}

describe("CreditsProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("provides default values when no initial props", () => {
    render(
      <CreditsProvider>
        <TestConsumer />
      </CreditsProvider>
    );

    expect(screen.getByTestId("credits")).toHaveTextContent("0");
    expect(screen.getByTestId("creditsTotal")).toHaveTextContent("15");
    expect(screen.getByTestId("tier")).toHaveTextContent("FREE");
    expect(screen.getByTestId("sentimentCredits")).toHaveTextContent("0");
  });

  it("provides initial values from props", () => {
    render(
      <CreditsProvider
        initialCredits={10}
        initialCreditsTotal={30}
        initialTier="STARTER"
        initialSentimentCredits={100}
      >
        <TestConsumer />
      </CreditsProvider>
    );

    expect(screen.getByTestId("credits")).toHaveTextContent("10");
    expect(screen.getByTestId("creditsTotal")).toHaveTextContent("30");
    expect(screen.getByTestId("tier")).toHaveTextContent("STARTER");
    expect(screen.getByTestId("sentimentCredits")).toHaveTextContent("100");
  });

  it("updates credits via setCredits", () => {
    render(
      <CreditsProvider initialCredits={10}>
        <TestConsumer />
      </CreditsProvider>
    );

    act(() => {
      screen.getByText("Set Credits").click();
    });

    expect(screen.getByTestId("credits")).toHaveTextContent("5");
  });

  it("refreshes credits from /api/dashboard/stats", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            credits: { remaining: 8, total: 15, resetDate: null },
            sentiment: { remaining: 20, total: 35, resetDate: null },
            tier: "FREE",
          },
        }),
    });

    render(
      <CreditsProvider initialCredits={15}>
        <TestConsumer />
      </CreditsProvider>
    );

    act(() => {
      screen.getByText("Refresh").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("credits")).toHaveTextContent("8");
      expect(screen.getByTestId("sentimentCredits")).toHaveTextContent("20");
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/dashboard/stats");
  });

  it("handles refresh failure gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network error")
    );

    render(
      <CreditsProvider initialCredits={10}>
        <TestConsumer />
      </CreditsProvider>
    );

    act(() => {
      screen.getByText("Refresh").click();
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to refresh credits:",
        expect.any(Error)
      );
    });

    // Credits should remain unchanged
    expect(screen.getByTestId("credits")).toHaveTextContent("10");

    consoleSpy.mockRestore();
  });
});

describe("useCredits hook", () => {
  it("throws when used outside CreditsProvider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<TestConsumer />)).toThrow(
      "useCredits must be used within a CreditsProvider"
    );

    consoleSpy.mockRestore();
  });
});

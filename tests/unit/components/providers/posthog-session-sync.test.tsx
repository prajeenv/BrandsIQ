import { render, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useState } from "react";

// Mock posthog-js completely so we can assert call counts and args.
// init / capture are stubbed; identify and reset are what we actually
// care about for PostHogSessionSync's behaviour.
const initMock = vi.fn();
const captureMock = vi.fn();
const identifyMock = vi.fn();
const resetMock = vi.fn();

vi.mock("posthog-js", () => ({
  default: {
    init: (...args: unknown[]) => initMock(...args),
    capture: (...args: unknown[]) => captureMock(...args),
    identify: (...args: unknown[]) => identifyMock(...args),
    reset: (...args: unknown[]) => resetMock(...args),
  },
}));

// posthog-js/react just provides a passthrough provider for context — stub
// it so we don't pull in React DevTools dependencies in jsdom.
vi.mock("posthog-js/react", () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// next/navigation — PostHogPageView reads pathname / searchParams. We
// give it stable defaults so the autocapture-pageview useEffect doesn't
// interfere with our identify assertions.
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// next-auth/react — useSession is the input we vary across tests via a
// controllable state hook. The mock module is created once; each test
// flips a top-level mutable shape that the hook reads.
type FakeSession = {
  data: {
    user: { id: string; tier: string; isBetaUser: boolean };
  } | null;
  status: "loading" | "authenticated" | "unauthenticated";
};

let fakeSession: FakeSession = {
  data: null,
  status: "unauthenticated",
};

vi.mock("next-auth/react", () => ({
  useSession: () => fakeSession,
}));

import { PostHogProvider } from "@/components/providers/PostHogProvider";

beforeEach(() => {
  vi.clearAllMocks();
  fakeSession = { data: null, status: "unauthenticated" };
});

/**
 * Helper component that swaps the session state and re-renders the provider.
 * We can't change the module-level fakeSession and expect React to react,
 * so we wrap the provider in a tiny stateful host that triggers a re-render
 * when we call setSession from outside (via a ref).
 */
function ProviderHarness({
  initialSession,
}: {
  initialSession: FakeSession;
}) {
  const [, setTick] = useState(0);
  // Expose a forceUpdate by re-rendering when session ref changes.
  if (fakeSession !== initialSession) {
    fakeSession = initialSession;
  }

  return (
    <PostHogProvider>
      <div data-testid="child">
        <button onClick={() => setTick((t) => t + 1)}>tick</button>
      </div>
    </PostHogProvider>
  );
}

describe("PostHogSessionSync", () => {
  it("calls posthog.identify once on initial signed-in mount with tier + isBetaUser", async () => {
    fakeSession = {
      data: {
        user: { id: "user_abc", tier: "FREE", isBetaUser: true },
      },
      status: "authenticated",
    };

    render(<ProviderHarness initialSession={fakeSession} />);

    await waitFor(() => {
      expect(identifyMock).toHaveBeenCalledTimes(1);
    });
    expect(identifyMock).toHaveBeenCalledWith("user_abc", {
      tier: "FREE",
      isBetaUser: true,
    });
  });

  it("does NOT call identify when status is 'loading'", async () => {
    fakeSession = {
      data: null,
      status: "loading",
    };

    render(<ProviderHarness initialSession={fakeSession} />);

    // Give effects a chance to run
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(identifyMock).not.toHaveBeenCalled();
    expect(resetMock).not.toHaveBeenCalled();
  });

  it("calls posthog.reset when a previously-identified user signs out", async () => {
    // First: signed in
    const authedSession: FakeSession = {
      data: {
        user: { id: "user_abc", tier: "FREE", isBetaUser: false },
      },
      status: "authenticated",
    };

    const { rerender } = render(
      <ProviderHarness initialSession={authedSession} />,
    );

    await waitFor(() => {
      expect(identifyMock).toHaveBeenCalledTimes(1);
    });

    // Then: signed out
    const signedOutSession: FakeSession = {
      data: null,
      status: "unauthenticated",
    };
    fakeSession = signedOutSession;
    rerender(<ProviderHarness initialSession={signedOutSession} />);

    await waitFor(() => {
      expect(resetMock).toHaveBeenCalledTimes(1);
    });
  });

  it("re-identifies when tier changes for the same user", async () => {
    // Start as FREE
    const freeSession: FakeSession = {
      data: {
        user: { id: "user_abc", tier: "FREE", isBetaUser: false },
      },
      status: "authenticated",
    };

    const { rerender } = render(
      <ProviderHarness initialSession={freeSession} />,
    );

    await waitFor(() => {
      expect(identifyMock).toHaveBeenCalledTimes(1);
    });
    expect(identifyMock).toHaveBeenLastCalledWith("user_abc", {
      tier: "FREE",
      isBetaUser: false,
    });

    // Upgrade to STARTER — same user id, different tier. This is the bug
    // the PR fixed — the previous code keyed dedupe on userId alone, so
    // this second identify was silently skipped.
    const starterSession: FakeSession = {
      data: {
        user: { id: "user_abc", tier: "STARTER", isBetaUser: false },
      },
      status: "authenticated",
    };
    fakeSession = starterSession;
    rerender(<ProviderHarness initialSession={starterSession} />);

    await waitFor(() => {
      expect(identifyMock).toHaveBeenCalledTimes(2);
    });
    expect(identifyMock).toHaveBeenLastCalledWith("user_abc", {
      tier: "STARTER",
      isBetaUser: false,
    });
  });

  it("re-identifies when isBetaUser flips for the same user", async () => {
    // Start non-beta
    const nonBetaSession: FakeSession = {
      data: {
        user: { id: "user_abc", tier: "FREE", isBetaUser: false },
      },
      status: "authenticated",
    };

    const { rerender } = render(
      <ProviderHarness initialSession={nonBetaSession} />,
    );

    await waitFor(() => {
      expect(identifyMock).toHaveBeenCalledTimes(1);
    });

    // Founder grants beta — isBetaUser flips. On next sign-in this would
    // reach the JWT and arrive here; the harness simulates that flip.
    const betaSession: FakeSession = {
      data: {
        user: { id: "user_abc", tier: "FREE", isBetaUser: true },
      },
      status: "authenticated",
    };
    fakeSession = betaSession;
    rerender(<ProviderHarness initialSession={betaSession} />);

    await waitFor(() => {
      expect(identifyMock).toHaveBeenCalledTimes(2);
    });
    expect(identifyMock).toHaveBeenLastCalledWith("user_abc", {
      tier: "FREE",
      isBetaUser: true,
    });
  });

  it("does NOT re-identify when session re-renders with identical values", async () => {
    // Mounts ref-state to confirm dedupe key works for the unchanged case.
    const session: FakeSession = {
      data: {
        user: { id: "user_abc", tier: "FREE", isBetaUser: false },
      },
      status: "authenticated",
    };

    const { rerender } = render(
      <ProviderHarness initialSession={session} />,
    );

    await waitFor(() => {
      expect(identifyMock).toHaveBeenCalledTimes(1);
    });

    // Re-render with the same session shape. Should not fire identify
    // again — dedupe key is the same.
    rerender(<ProviderHarness initialSession={session} />);

    // Give effects a chance to run
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(identifyMock).toHaveBeenCalledTimes(1);
  });

  it("re-identifies when a different user signs in after reset", async () => {
    // User A signs in
    const userA: FakeSession = {
      data: {
        user: { id: "user_a", tier: "FREE", isBetaUser: false },
      },
      status: "authenticated",
    };
    const { rerender } = render(<ProviderHarness initialSession={userA} />);

    await waitFor(() => {
      expect(identifyMock).toHaveBeenCalledTimes(1);
    });

    // Sign out
    const signedOut: FakeSession = { data: null, status: "unauthenticated" };
    fakeSession = signedOut;
    rerender(<ProviderHarness initialSession={signedOut} />);
    await waitFor(() => {
      expect(resetMock).toHaveBeenCalledTimes(1);
    });

    // User B signs in (different id)
    const userB: FakeSession = {
      data: {
        user: { id: "user_b", tier: "STARTER", isBetaUser: true },
      },
      status: "authenticated",
    };
    fakeSession = userB;
    rerender(<ProviderHarness initialSession={userB} />);

    await waitFor(() => {
      expect(identifyMock).toHaveBeenCalledTimes(2);
    });
    expect(identifyMock).toHaveBeenLastCalledWith("user_b", {
      tier: "STARTER",
      isBetaUser: true,
    });
  });
});

describe("PostHogProvider init", () => {
  it("calls posthog.init with person_profiles=identified_only", async () => {
    fakeSession = { data: null, status: "unauthenticated" };

    render(<ProviderHarness initialSession={fakeSession} />);

    await waitFor(() => {
      expect(initMock).toHaveBeenCalled();
    });

    // Second argument to init is the options object
    const initOptions = initMock.mock.calls[0][1];
    expect(initOptions).toMatchObject({
      person_profiles: "identified_only",
      capture_pageview: false,
    });
  });
});

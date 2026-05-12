import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// MVP Phase 1 follow-up: ProfileForm component on /dashboard/settings/profile.
// See src/components/settings/ProfileForm.tsx.
//
// We use real timers here. The autosave debounce is 1500ms; the tests wait
// it out with waitFor + a slightly-larger ceiling. Fake timers + waitFor mix
// poorly because waitFor relies on real timers under the hood.

const updateSessionMock = vi.fn();
const refreshCreditsMock = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { id: "u-1", email: "a@x.com", name: "Alice" } },
    update: updateSessionMock,
    status: "authenticated",
  }),
}));

vi.mock("@/components/providers/CreditsProvider", () => ({
  useCredits: () => ({
    credits: 150,
    creditsTotal: 150,
    creditsResetDate: "2026-06-15T00:00:00Z",
    sentimentCredits: 750,
    sentimentTotal: 750,
    sentimentResetDate: "2026-06-15T00:00:00Z",
    tier: "FREE",
    isBetaUser: true,
    currentPhase: "phase_1" as const,
    organizationName: "Bear Bakery",
    setCredits: vi.fn(),
    refreshCredits: refreshCreditsMock,
  }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { ProfileForm } from "@/components/settings/ProfileForm";

const PROFILE_FIXTURE = {
  id: "u-1",
  email: "a@x.com",
  name: "Alice",
  organizationName: "Bear Bakery",
  industry: "Cafe",
  country: "United Kingdom",
  locationCountEstimate: 3,
  primaryPlatform: "Google",
  isBetaUser: true,
  tier: "FREE",
};

const LOCATION_FIXTURE = {
  id: "loc-1",
  name: "Bear Bakery — Shoreditch",
};

function makeGetResponse(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    json: async () => ({
      success: true,
      data: {
        profile: { ...PROFILE_FIXTURE, ...((overrides.profile as object) ?? {}) },
        location: (overrides.location as unknown) ?? LOCATION_FIXTURE,
        hasPassword: (overrides.hasPassword as boolean) ?? true,
      },
    }),
  };
}

function makePatchResponse(profileOverrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    json: async () => ({
      success: true,
      data: {
        profile: { ...PROFILE_FIXTURE, ...profileOverrides },
      },
    }),
  };
}

// Slight ceiling above the 1500ms debounce. Keeps tests under ~2s each.
const AUTOSAVE_WAIT_MS = 2500;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ProfileForm — render + fetch", () => {
  it("seeds form fields from GET /api/user/settings/profile", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(makeGetResponse());

    render(<ProfileForm />);

    await waitFor(() => {
      expect((screen.getByLabelText(/display name/i) as HTMLInputElement).value).toBe("Alice");
    });
    expect((screen.getByLabelText(/organization name/i) as HTMLInputElement).value).toBe(
      "Bear Bakery",
    );
    expect((screen.getByLabelText(/location name/i) as HTMLInputElement).value).toBe(
      "Bear Bakery — Shoreditch",
    );
    expect((screen.getByLabelText(/^email$/i) as HTMLInputElement).value).toBe("a@x.com");
    expect((screen.getByLabelText(/^email$/i) as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText(/closed beta/i)).toBeInTheDocument();
  });

  it("hides 'Change password' link for OAuth-only users", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(makeGetResponse({ hasPassword: false }));

    render(<ProfileForm />);

    // Wait for the initial fetch to populate so we can confidently assert
    // the absence of the link.
    await waitFor(() => {
      expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/change password/i)).not.toBeInTheDocument();
  });

  it("shows 'Change password' link for credentials users", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(makeGetResponse({ hasPassword: true }));

    render(<ProfileForm />);
    await waitFor(() => {
      expect(screen.getByText(/change password/i)).toBeInTheDocument();
    });
  });
});

describe("ProfileForm — autosave", () => {
  it("PATCHes only the changed name field after the debounce", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeGetResponse())
      .mockResolvedValueOnce(makePatchResponse({ name: "Alice Updated" }));
    global.fetch = fetchMock;

    render(<ProfileForm />);

    await waitFor(() => {
      expect((screen.getByLabelText(/display name/i) as HTMLInputElement).value).toBe("Alice");
    });

    const nameInput = screen.getByLabelText(/display name/i);
    fireEvent.change(nameInput, { target: { value: "Alice Updated" } });

    // Status flips to 'Unsaved' immediately
    await waitFor(() => {
      expect(screen.getByText(/^unsaved$/i)).toBeInTheDocument();
    });

    // Wait out the debounce and the PATCH round-trip
    await waitFor(
      () => {
        const patchCall = fetchMock.mock.calls.find(
          (c) => (c[1] as RequestInit)?.method === "PATCH",
        );
        expect(patchCall).toBeTruthy();
      },
      { timeout: AUTOSAVE_WAIT_MS },
    );

    const patchCall = fetchMock.mock.calls.find(
      (c) => (c[1] as RequestInit)?.method === "PATCH",
    );
    expect(JSON.parse((patchCall![1] as RequestInit).body as string)).toEqual({
      name: "Alice Updated",
    });

    // Name change triggers updateSession + refreshCredits
    await waitFor(() => {
      expect(updateSessionMock).toHaveBeenCalled();
      expect(refreshCreditsMock).toHaveBeenCalled();
    });
  });

  it("PATCHes only the changed organizationName field after the debounce", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeGetResponse())
      .mockResolvedValueOnce(makePatchResponse({ organizationName: "New Org" }));
    global.fetch = fetchMock;

    render(<ProfileForm />);
    await waitFor(() => {
      expect((screen.getByLabelText(/organization name/i) as HTMLInputElement).value).toBe(
        "Bear Bakery",
      );
    });

    fireEvent.change(screen.getByLabelText(/organization name/i), {
      target: { value: "New Org" },
    });

    await waitFor(
      () => {
        const patchCall = fetchMock.mock.calls.find(
          (c) => (c[1] as RequestInit)?.method === "PATCH",
        );
        expect(patchCall).toBeTruthy();
      },
      { timeout: AUTOSAVE_WAIT_MS },
    );

    const patchCall = fetchMock.mock.calls.find(
      (c) => (c[1] as RequestInit)?.method === "PATCH",
    );
    expect(JSON.parse((patchCall![1] as RequestInit).body as string)).toEqual({
      organizationName: "New Org",
    });

    // organizationName change triggers refreshCredits (not updateSession)
    await waitFor(() => {
      expect(refreshCreditsMock).toHaveBeenCalled();
    });
  });

  it("PATCHes only the changed locationName when location is edited", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeGetResponse())
      .mockResolvedValueOnce(makePatchResponse());
    global.fetch = fetchMock;

    render(<ProfileForm />);
    await waitFor(() => {
      expect((screen.getByLabelText(/location name/i) as HTMLInputElement).value).toBe(
        "Bear Bakery — Shoreditch",
      );
    });

    fireEvent.change(screen.getByLabelText(/location name/i), {
      target: { value: "New Branch" },
    });

    await waitFor(
      () => {
        const patchCall = fetchMock.mock.calls.find(
          (c) => (c[1] as RequestInit)?.method === "PATCH",
        );
        expect(patchCall).toBeTruthy();
      },
      { timeout: AUTOSAVE_WAIT_MS },
    );

    const patchCall = fetchMock.mock.calls.find(
      (c) => (c[1] as RequestInit)?.method === "PATCH",
    );
    expect(JSON.parse((patchCall![1] as RequestInit).body as string)).toEqual({
      locationName: "New Branch",
    });
  });

  it("does not PATCH when the field is changed back to its original value", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(makeGetResponse());
    global.fetch = fetchMock;

    render(<ProfileForm />);
    await waitFor(() => {
      expect((screen.getByLabelText(/display name/i) as HTMLInputElement).value).toBe("Alice");
    });

    const nameInput = screen.getByLabelText(/display name/i);
    fireEvent.change(nameInput, { target: { value: "Alice Edited" } });
    fireEvent.change(nameInput, { target: { value: "Alice" } });

    // Wait longer than the debounce — no PATCH should fire
    await new Promise((resolve) => setTimeout(resolve, AUTOSAVE_WAIT_MS));

    const patchCalls = fetchMock.mock.calls.filter(
      (c) => (c[1] as RequestInit)?.method === "PATCH",
    );
    expect(patchCalls.length).toBe(0);
  });

  it("does not PATCH when a required field is cleared to empty", async () => {
    // buildChangedPayload drops required fields (name, org, etc.) that have
    // been cleared. The field doesn't autosave; the user has to type
    // something valid. Avoids spam validation errors mid-typing.
    const fetchMock = vi.fn().mockResolvedValueOnce(makeGetResponse());
    global.fetch = fetchMock;

    render(<ProfileForm />);
    await waitFor(() => {
      expect((screen.getByLabelText(/display name/i) as HTMLInputElement).value).toBe("Alice");
    });

    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: "" } });

    await new Promise((resolve) => setTimeout(resolve, AUTOSAVE_WAIT_MS));

    const patchCalls = fetchMock.mock.calls.filter(
      (c) => (c[1] as RequestInit)?.method === "PATCH",
    );
    expect(patchCalls.length).toBe(0);
  });
});

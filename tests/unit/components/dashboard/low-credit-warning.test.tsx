import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LowCreditWarning } from '@/components/dashboard/LowCreditWarning';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard',
}));

describe('LowCreditWarning', () => {
  it('shows nothing when credits are sufficient', () => {
    const { container } = render(
      <LowCreditWarning
        creditsRemaining={15}
        creditsTotal={15}
        tier="FREE"
      />
    );

    // No warning banner should be rendered
    expect(container.textContent).toBe('');
  });

  it('shows yellow warning when response credits are low but not zero', () => {
    const { container } = render(
      <LowCreditWarning
        creditsRemaining={2}
        creditsTotal={15}
        tier="FREE"
        resetDate="2026-02-01T00:00:00Z"
      />
    );

    // Should show a warning about running low on credits
    expect(
      screen.getByText(/running low|low on.*credit/i)
    ).toBeInTheDocument();
    // Yellow warning uses a non-destructive style (not red)
    const alert = container.querySelector('[role="alert"]') || container.firstElementChild;
    expect(alert).toBeInTheDocument();
  });

  it('shows red warning when response credits are zero', () => {
    render(
      <LowCreditWarning
        creditsRemaining={0}
        creditsTotal={15}
        tier="FREE"
        resetDate="2026-02-01T00:00:00Z"
      />
    );

    // Should show an "out of" credits message
    expect(
      screen.getByText(/out of.*credit/i)
    ).toBeInTheDocument();
  });

  it('shows sentiment warning when sentiment credits are low', () => {
    render(
      <LowCreditWarning
        creditsRemaining={15}
        creditsTotal={15}
        tier="FREE"
        sentimentRemaining={2}
        sentimentTotal={35}
        sentimentResetDate="2026-02-01T00:00:00Z"
      />
    );

    // Should show warning title about sentiment credits
    expect(
      screen.getByText(/Running Low on Sentiment Credits/i)
    ).toBeInTheDocument();
  });

  it('shows "Upgrade Plan" link pointing to /pricing', () => {
    render(
      <LowCreditWarning
        creditsRemaining={0}
        creditsTotal={15}
        tier="FREE"
        resetDate="2026-02-01T00:00:00Z"
      />
    );

    const upgradeLink = screen.getByRole('link', { name: /upgrade/i });
    expect(upgradeLink).toBeInTheDocument();
    expect(upgradeLink).toHaveAttribute('href', '/pricing');
  });

  it('can be dismissed by clicking the dismiss button', () => {
    render(
      <LowCreditWarning
        creditsRemaining={0}
        creditsTotal={15}
        tier="FREE"
        resetDate="2026-02-01T00:00:00Z"
      />
    );

    // Warning should be visible initially
    expect(screen.getByText(/out of.*credit|running low/i)).toBeInTheDocument();

    // Dismiss button has sr-only text "Dismiss"
    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissButton);

    // After dismissal, warning should disappear
    expect(screen.queryByText(/out of.*credit|running low/i)).not.toBeInTheDocument();
  });

  it('shows "Out of Credits" when both response and sentiment credits are zero', () => {
    render(
      <LowCreditWarning
        creditsRemaining={0}
        creditsTotal={15}
        tier="FREE"
        resetDate="2026-02-01T00:00:00Z"
        sentimentRemaining={0}
        sentimentTotal={35}
        sentimentResetDate="2026-02-01T00:00:00Z"
      />
    );

    expect(
      screen.getByText(/out of credits/i)
    ).toBeInTheDocument();
  });

  it('handles missing sentiment props gracefully (backward compatibility)', () => {
    const { container } = render(
      <LowCreditWarning
        creditsRemaining={2}
        creditsTotal={15}
        tier="FREE"
        resetDate="2026-02-01T00:00:00Z"
      />
    );

    // Should still render the response credit warning without crashing
    expect(
      screen.getByText(/running low|low on.*credit/i)
    ).toBeInTheDocument();
    // Should not mention sentiment when props are absent
    expect(container.textContent).not.toMatch(/sentiment/i);
  });
});

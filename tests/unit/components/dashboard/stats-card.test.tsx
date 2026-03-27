import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StatsCard, QuotaCard } from '@/components/dashboard/StatsCard';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard',
}));

describe('StatsCard', () => {
  it('renders title and value', () => {
    render(<StatsCard title="Total Reviews" value="42" />);

    expect(screen.getByText('Total Reviews')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <StatsCard title="Total Reviews" value="42" description="All time reviews" />
    );

    expect(screen.getByText('All time reviews')).toBeInTheDocument();
  });

  it('shows skeleton when isLoading is true', () => {
    const { container } = render(
      <StatsCard title="Total Reviews" value="42" isLoading />
    );

    // When loading, the value text should not be rendered
    expect(screen.queryByText('42')).not.toBeInTheDocument();
    // Skeleton elements should be present (animated placeholder divs)
    const skeletons = container.querySelectorAll('[class*="animate"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders positive trend text', () => {
    render(
      <StatsCard
        title="Reviews"
        value="50"
        trend={{ value: 12, label: 'vs last month' }}
      />
    );

    expect(screen.getByText(/12/)).toBeInTheDocument();
  });

  it('renders negative trend text', () => {
    render(
      <StatsCard
        title="Reviews"
        value="50"
        trend={{ value: -8, label: 'vs last month' }}
      />
    );

    // The component renders Math.abs(trend.value) so it shows "8%" not "-8"
    expect(screen.getByText(/8%/)).toBeInTheDocument();
  });

  it('handles no trend gracefully', () => {
    const { container } = render(
      <StatsCard title="Reviews" value="50" />
    );

    expect(screen.getByText('Reviews')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    // No trend-related percentage text should appear
    expect(container.textContent).not.toMatch(/%/);
  });
});

describe('QuotaCard', () => {
  it('renders remaining count and total', () => {
    render(<QuotaCard title="Response Credits" used={3} total={15} />);

    // Should show remaining (12) and total (15) like "12 / 15"
    expect(screen.getByText(/12/)).toBeInTheDocument();
    expect(screen.getByText(/15/)).toBeInTheDocument();
  });

  it('shows progress bar', () => {
    const { container } = render(
      <QuotaCard title="Response Credits" used={5} total={15} />
    );

    // Progress bar is rendered as a div with a role or a styled bar
    const progressElement =
      container.querySelector('[role="progressbar"]') ||
      container.querySelector('[class*="progress"]') ||
      container.querySelector('[class*="bg-"]');
    expect(progressElement).toBeInTheDocument();
  });

  it('shows reset date when provided', () => {
    const resetDate = '2026-02-01T00:00:00Z';
    render(
      <QuotaCard
        title="Response Credits"
        used={3}
        total={15}
        resetDate={resetDate}
      />
    );

    // Should display a formatted reset date (e.g., "Feb 1" or "Resets on")
    expect(
      screen.getByText(/resets|feb|reset/i)
    ).toBeInTheDocument();
  });

  it('shows skeleton when isLoading is true', () => {
    const { container } = render(
      <QuotaCard title="Response Credits" used={3} total={15} isLoading />
    );

    // When loading, actual values should not be rendered
    expect(screen.queryByText(/12/)).not.toBeInTheDocument();
    const skeletons = container.querySelectorAll('[class*="animate"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

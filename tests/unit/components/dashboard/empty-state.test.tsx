import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EmptyState, EmptyReviews } from '@/components/dashboard/EmptyState';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard',
}));

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(
      <EmptyState
        title="Nothing here"
        description="Get started by creating your first item."
      />
    );

    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(
      screen.getByText('Get started by creating your first item.')
    ).toBeInTheDocument();
  });

  it('renders action link when actionHref is provided', () => {
    render(
      <EmptyState
        title="No data"
        description="Start adding data."
        actionLabel="Add Item"
        actionHref="/dashboard/items/new"
      />
    );

    const link = screen.getByRole('link', { name: /add item/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/dashboard/items/new');
  });

  it('does not render action button when no actionLabel is provided', () => {
    render(
      <EmptyState
        title="No data"
        description="Nothing to show."
      />
    );

    // No links or buttons beyond the content
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onAction callback when action button is clicked', () => {
    const handleAction = vi.fn();

    render(
      <EmptyState
        title="No data"
        description="Nothing to show."
        actionLabel="Do Something"
        onAction={handleAction}
      />
    );

    const button = screen.getByRole('button', { name: /do something/i });
    fireEvent.click(button);

    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});

describe('EmptyReviews', () => {
  it('renders "No reviews yet" title', () => {
    render(<EmptyReviews />);

    expect(screen.getByText(/no reviews yet/i)).toBeInTheDocument();
  });

  it('renders "Add Review" link pointing to /dashboard/reviews/new', () => {
    render(<EmptyReviews />);

    const link = screen.getByRole('link', { name: /add.*review/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/dashboard/reviews/new');
  });
});

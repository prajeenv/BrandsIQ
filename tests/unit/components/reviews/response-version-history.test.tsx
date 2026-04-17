import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ResponseVersionHistory } from "@/components/reviews/ResponseVersionHistory";

const mockVersions = [
  {
    id: "ver_1",
    responseText: "First version of the response",
    toneUsed: "professional",
    creditsUsed: 1,
    isEdited: false,
    createdAt: new Date().toISOString(),
    originalCreatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "ver_2",
    responseText: "This was manually edited by the user",
    toneUsed: "professional",
    creditsUsed: 0,
    isEdited: true,
    createdAt: new Date().toISOString(),
    originalCreatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

describe("ResponseVersionHistory", () => {
  it("returns null when versions is empty", () => {
    const { container } = render(<ResponseVersionHistory versions={[]} />);

    expect(container.innerHTML).toBe("");
  });

  it("renders collapsible trigger with version count", () => {
    render(<ResponseVersionHistory versions={mockVersions} />);

    expect(screen.getByText("Version History (2)")).toBeInTheDocument();
  });

  it("expands to show versions on trigger click", () => {
    render(<ResponseVersionHistory versions={mockVersions} />);

    // Click to expand
    fireEvent.click(screen.getByText("Version History (2)"));

    // Version content should now be visible
    expect(
      screen.getByText("First version of the response")
    ).toBeInTheDocument();
  });

  it('shows "Generated" badge for non-edited versions', () => {
    render(<ResponseVersionHistory versions={mockVersions} />);
    fireEvent.click(screen.getByText("Version History (2)"));

    expect(screen.getByText("Generated")).toBeInTheDocument();
  });

  it('shows "Edited" badge for edited versions', () => {
    render(<ResponseVersionHistory versions={mockVersions} />);
    fireEvent.click(screen.getByText("Version History (2)"));

    expect(screen.getByText("Edited")).toBeInTheDocument();
  });

  it("shows tone badge for generated versions", () => {
    render(<ResponseVersionHistory versions={mockVersions} />);
    fireEvent.click(screen.getByText("Version History (2)"));

    expect(screen.getByText("professional")).toBeInTheDocument();
  });

  it("shows credit count for generated versions", () => {
    render(<ResponseVersionHistory versions={mockVersions} />);
    fireEvent.click(screen.getByText("Version History (2)"));

    expect(screen.getByText("1 credit")).toBeInTheDocument();
  });

  it('shows "Show more" for long version text', () => {
    const longVersions = [
      {
        ...mockVersions[0],
        responseText: "A".repeat(200),
      },
    ];

    render(<ResponseVersionHistory versions={longVersions} />);
    fireEvent.click(screen.getByText("Version History (1)"));

    expect(screen.getByText("Show more")).toBeInTheDocument();
  });
});

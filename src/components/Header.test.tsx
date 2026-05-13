import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Header } from "./Header";

describe("Header", () => {
  it("renders the wordmark and tagline", () => {
    render(<Header />);
    expect(screen.getByRole("heading", { level: 1, name: /menu generator/i })).toBeInTheDocument();
    expect(screen.getByText(/create your graphical menu/i)).toBeInTheDocument();
  });

  it("does not render an EAT OR MAY eyebrow", () => {
    render(<Header />);
    expect(screen.queryByText(/eat or may/i)).not.toBeInTheDocument();
  });
});

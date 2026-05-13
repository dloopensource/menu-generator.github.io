import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBanner } from "./ErrorBanner";

describe("ErrorBanner", () => {
  it("renders nothing when message is null", () => {
    const { container } = render(<ErrorBanner message={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the message when provided", () => {
    render(<ErrorBanner message="key invalid" />);
    expect(screen.getByRole("alert")).toHaveTextContent(/key invalid/i);
  });
});

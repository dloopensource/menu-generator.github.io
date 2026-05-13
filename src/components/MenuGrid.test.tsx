import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MenuGrid } from "./MenuGrid";
import type { MenuCard } from "../state/types";

function card(id: string, name: string): MenuCard {
  return {
    id,
    category: "",
    name,
    description: "",
    price: "",
    imageUrl: null,
    status: "pending",
  };
}

describe("MenuGrid", () => {
  it("renders one MenuCard per entry", () => {
    render(
      <MenuGrid cards={[card("a", "X"), card("b", "Y")]} onEdit={() => {}} onRegenerate={() => {}} />,
    );
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("renders the subtitle '2 courses, plated' when cards are ready", () => {
    const ready = (id: string): MenuCard => ({ ...card(id, "z"), status: "ready", imageUrl: "u" });
    render(<MenuGrid cards={[ready("a"), ready("b")]} onEdit={() => {}} onRegenerate={() => {}} />);
    expect(screen.getByText(/2 courses/i)).toBeInTheDocument();
  });

  it("renders nothing visible when cards is empty", () => {
    const { container } = render(<MenuGrid cards={[]} onEdit={() => {}} onRegenerate={() => {}} />);
    expect(container.querySelectorAll("article")).toHaveLength(0);
  });
});

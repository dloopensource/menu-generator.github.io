import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MenuCard } from "./MenuCard";
import type { MenuCard as Card } from "../state/types";

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: "a",
    category: "PASTA",
    name: "Rigatoni",
    description: "tomato + guanciale",
    price: "$25",
    imageUrl: "blob:img",
    status: "ready",
    ...overrides,
  };
}

describe("MenuCard", () => {
  it("renders the image, name, description and price", () => {
    render(
      <MenuCard card={makeCard()} onEdit={() => {}} onRegenerate={() => {}} />,
    );
    expect(screen.getByRole("img")).toHaveAttribute("src", "blob:img");
    expect(screen.getByDisplayValue("Rigatoni")).toBeInTheDocument();
    expect(screen.getByDisplayValue("tomato + guanciale")).toBeInTheDocument();
    expect(screen.getByDisplayValue("$25")).toBeInTheDocument();
  });

  it("shows a skeleton when status is generating", () => {
    render(
      <MenuCard
        card={makeCard({ status: "generating", imageUrl: null })}
        onEdit={() => {}}
        onRegenerate={() => {}}
      />,
    );
    expect(screen.getByTestId("card-skeleton")).toBeInTheDocument();
  });

  it("shows an error message and retry control when status is error", async () => {
    const user = userEvent.setup();
    const onRegenerate = vi.fn();
    render(
      <MenuCard
        card={makeCard({
          status: "error",
          imageUrl: null,
          errorMessage: "Rate limited",
        })}
        onEdit={() => {}}
        onRegenerate={onRegenerate}
      />,
    );
    expect(screen.getByText(/rate limited/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /regenerate|retry/i }));
    expect(onRegenerate).toHaveBeenCalledWith("a");
  });

  it("calls onEdit with the new value when the user edits a field", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <MenuCard card={makeCard()} onEdit={onEdit} onRegenerate={() => {}} />,
    );
    const nameField = screen.getByDisplayValue("Rigatoni") as HTMLInputElement;
    await user.clear(nameField);
    await user.type(nameField, "Cacio e Pepe");
    expect(onEdit).toHaveBeenLastCalledWith("a", "name", "Cacio e Pepe");
  });

  it("clicking the regenerate button calls onRegenerate with the card id", async () => {
    const user = userEvent.setup();
    const onRegenerate = vi.fn();
    render(
      <MenuCard
        card={makeCard()}
        onEdit={() => {}}
        onRegenerate={onRegenerate}
      />,
    );
    await user.click(screen.getByRole("button", { name: /regenerate/i }));
    expect(onRegenerate).toHaveBeenCalledWith("a");
  });

  it("disables the regenerate button when card is pending and both name and description are empty", () => {
    render(
      <MenuCard
        card={{
          id: "blank",
          category: "",
          name: "",
          description: "",
          price: "",
          imageUrl: null,
          status: "pending",
        }}
        onEdit={() => {}}
        onRegenerate={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /regenerate/i })).toBeDisabled();
  });
});

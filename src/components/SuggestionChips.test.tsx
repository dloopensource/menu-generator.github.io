import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SuggestionChips, SUGGESTIONS } from "./SuggestionChips";

describe("SuggestionChips", () => {
  it("renders one chip per static suggestion", () => {
    render(<SuggestionChips onPick={() => {}} />);
    for (const s of SUGGESTIONS) {
      expect(screen.getByRole("button", { name: s.label })).toBeInTheDocument();
    }
  });

  it("calls onPick with the suggestion's prompt text when clicked", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<SuggestionChips onPick={onPick} />);
    await user.click(
      screen.getByRole("button", { name: SUGGESTIONS[0].label }),
    );
    expect(onPick).toHaveBeenCalledWith(SUGGESTIONS[0].prompt);
  });
});

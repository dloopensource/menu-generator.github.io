import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App";

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, "", "/?fake=true");
});

describe("Flow B — upload reference photo", () => {
  it("populates cards from the parsed menu items after upload + Generate menu", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<App />);
    const file = new File(["x"], "menu.jpg", { type: "image/jpeg" });
    await user.upload(
      screen.getByLabelText(/browse for a reference photo/i) as HTMLInputElement,
      file,
    );
    await user.click(screen.getByRole("button", { name: /generate menu/i }));
    await waitFor(
      () => expect(screen.getAllByRole("article")).toHaveLength(4),
      { timeout: 5000 },
    );
    // The fake parser returns the hardcoded Italian menu — confirm a known dish name.
    await waitFor(
      () => {
        expect(screen.getByDisplayValue(/Rigatoni all'Amatriciana/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  }, 12000);
});

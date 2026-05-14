import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App";

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, "", "/?fake=true");
});

describe("Flow A — text-only", () => {
  it("renders cards with images after Generate menu is clicked", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(
      screen.getByLabelText(/describe today's menu/i),
      "A four-course Italian dinner",
    );
    await user.click(screen.getByRole("button", { name: /generate menu/i }));

    // The fake generator delays parse 400ms and each image 600-1200ms; wait up to 5s.
    await waitFor(
      () => expect(screen.getAllByRole("article")).toHaveLength(4),
      { timeout: 5000 },
    );
  }, 8000);

  it("clicking ↻ on a card transitions just that card to generating", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/describe today's menu/i), "italian");
    await user.click(screen.getByRole("button", { name: /generate menu/i }));
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(4), { timeout: 5000 });

    // Wait for at least one card to reach ready.
    await waitFor(
      () => {
        const articles = screen.getAllByRole("article");
        return articles[0].querySelector("img") !== null;
      },
      { timeout: 5000 },
    );

    const articles = screen.getAllByRole("article");
    const regenBtn = articles[0].querySelector(
      "button[aria-label*='egenerate']",
    ) as HTMLButtonElement;
    await user.click(regenBtn);
    // The targeted card should now show a skeleton.
    await waitFor(
      () => {
        expect(articles[0].querySelector("[data-testid='card-skeleton']")).toBeTruthy();
      },
      { timeout: 2000 },
    );
  }, 12000);
});

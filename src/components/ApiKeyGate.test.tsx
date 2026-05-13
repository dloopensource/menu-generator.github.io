import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiKeyGate } from "./ApiKeyGate";
import { API_KEY_STORAGE_KEY } from "../hooks/useApiKey";

beforeEach(() => {
  window.localStorage.clear();
  // ensure we are not in fake mode for these tests
  window.history.replaceState({}, "", "/");
});

describe("ApiKeyGate", () => {
  it("renders the ApiKeyForm when no key is set", () => {
    render(
      <ApiKeyGate>
        <div>protected</div>
      </ApiKeyGate>,
    );
    expect(screen.getByLabelText(/gemini api key/i)).toBeInTheDocument();
    expect(screen.queryByText("protected")).not.toBeInTheDocument();
  });

  it("renders children when a key is already stored", () => {
    window.localStorage.setItem(API_KEY_STORAGE_KEY, "k");
    render(
      <ApiKeyGate>
        <div>protected</div>
      </ApiKeyGate>,
    );
    expect(screen.getByText("protected")).toBeInTheDocument();
  });

  it("reveals children after the user saves a key", async () => {
    const user = userEvent.setup();
    render(
      <ApiKeyGate>
        <div>protected</div>
      </ApiKeyGate>,
    );
    await user.type(screen.getByLabelText(/gemini api key/i), "fresh-key");
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(screen.getByText("protected")).toBeInTheDocument();
  });

  it("renders children unconditionally when ?fake=true is in the URL", () => {
    window.history.replaceState({}, "", "/?fake=true");
    render(
      <ApiKeyGate>
        <div>protected</div>
      </ApiKeyGate>,
    );
    expect(screen.getByText("protected")).toBeInTheDocument();
  });
});

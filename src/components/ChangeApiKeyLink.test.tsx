import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChangeApiKeyLink } from "./ChangeApiKeyLink";
import { API_KEY_STORAGE_KEY } from "../hooks/useApiKey";

beforeEach(() => {
  window.localStorage.setItem(API_KEY_STORAGE_KEY, "existing");
});

describe("ChangeApiKeyLink", () => {
  it("clears the stored key and reloads when clicked", async () => {
    const user = userEvent.setup();
    const reload = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...window.location, reload },
      writable: true,
    });
    render(<ChangeApiKeyLink />);
    await user.click(screen.getByRole("button", { name: /change api key/i }));
    expect(window.localStorage.getItem(API_KEY_STORAGE_KEY)).toBeNull();
    expect(reload).toHaveBeenCalled();
  });
});

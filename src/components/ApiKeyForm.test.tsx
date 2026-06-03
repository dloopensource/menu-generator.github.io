import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiKeyForm } from "./ApiKeyForm";

describe("ApiKeyForm", () => {
  it("renders an input and a save button", () => {
    render(<ApiKeyForm onSave={() => {}} />);
    expect(screen.getByLabelText(/gemini api key/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
  });

  it("calls onSave with the trimmed key when submitted", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ApiKeyForm onSave={onSave} />);
    await user.type(screen.getByLabelText(/gemini api key/i), "   abc123   ");
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(onSave).toHaveBeenCalledWith("abc123");
  });

  it("disables save when input is empty or whitespace", async () => {
    const user = userEvent.setup();
    render(<ApiKeyForm onSave={() => {}} />);
    const btn = screen.getByRole("button", { name: /save/i });
    expect(btn).toBeDisabled();
    await user.type(screen.getByLabelText(/gemini api key/i), "   ");
    expect(btn).toBeDisabled();
    await user.type(screen.getByLabelText(/gemini api key/i), "x");
    expect(btn).toBeEnabled();
  });
});

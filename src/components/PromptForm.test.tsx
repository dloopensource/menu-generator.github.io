import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PromptForm } from "./PromptForm";

describe("PromptForm", () => {
  it("disables Generate menu when prompt is empty and no photo is set", () => {
    render(<PromptForm count={4} onCountChange={() => {}} onGenerate={() => {}} isGenerating={false} />);
    expect(screen.getByRole("button", { name: /generate menu/i })).toBeDisabled();
  });

  it("enables Generate menu when prompt is non-empty", async () => {
    const user = userEvent.setup();
    render(<PromptForm count={4} onCountChange={() => {}} onGenerate={() => {}} isGenerating={false} />);
    await user.type(screen.getByLabelText(/describe today's menu/i), "pizza");
    expect(screen.getByRole("button", { name: /generate menu/i })).toBeEnabled();
  });

  it("clicking a suggestion chip fills the textarea", async () => {
    const user = userEvent.setup();
    render(<PromptForm count={4} onCountChange={() => {}} onGenerate={() => {}} isGenerating={false} />);
    await user.click(screen.getByRole("button", { name: /italian tasting menu/i }));
    expect(screen.getByLabelText(/describe today's menu/i)).toHaveDisplayValue(/italian/i);
  });

  it("calls onGenerate with the assembled request", async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn();
    render(<PromptForm count={4} onCountChange={() => {}} onGenerate={onGenerate} isGenerating={false} />);
    await user.type(screen.getByLabelText(/describe today's menu/i), "tacos");
    await user.click(screen.getByRole("button", { name: /generate menu/i }));
    expect(onGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: "tacos", count: 4, referencePhoto: null }),
    );
  });

  it("disables Generate menu while isGenerating is true", () => {
    render(<PromptForm count={4} onCountChange={() => {}} onGenerate={() => {}} isGenerating />);
    expect(screen.getByRole("button", { name: /generate menu/i })).toBeDisabled();
  });
});

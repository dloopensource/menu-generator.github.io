import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CountStepper } from "./CountStepper";

describe("CountStepper", () => {
  it("renders the current value", () => {
    render(<CountStepper value={4} onChange={() => {}} />);
    expect(screen.getByLabelText(/menu item count/i)).toHaveTextContent("4");
  });

  it("calls onChange with value+1 when + is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CountStepper value={4} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /increase/i }));
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it("calls onChange with value-1 when - is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CountStepper value={4} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /decrease/i }));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("disables - at 1 and + at 8", () => {
    const { rerender } = render(<CountStepper value={1} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /decrease/i })).toBeDisabled();
    rerender(<CountStepper value={8} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /increase/i })).toBeDisabled();
  });
});

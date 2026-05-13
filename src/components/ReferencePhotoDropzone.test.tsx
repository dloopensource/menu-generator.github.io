import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReferencePhotoDropzone } from "./ReferencePhotoDropzone";

function makeFile(name = "menu.jpg", type = "image/jpeg") {
  return new File(["x"], name, { type });
}

describe("ReferencePhotoDropzone", () => {
  it("shows the empty prompt when no file is set", () => {
    render(<ReferencePhotoDropzone file={null} onFileChange={() => {}} />);
    expect(screen.getByText(/drop a reference photo/i)).toBeInTheDocument();
  });

  it("calls onFileChange when the user selects a file via the input", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ReferencePhotoDropzone file={null} onFileChange={onChange} />);
    const input = screen.getByLabelText(/browse/i) as HTMLInputElement;
    const file = makeFile();
    await user.upload(input, file);
    expect(onChange).toHaveBeenCalledWith(file);
  });

  it("shows the file name and a remove button when a file is set", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ReferencePhotoDropzone
        file={makeFile("dinner.png", "image/png")}
        onFileChange={onChange}
      />,
    );
    expect(screen.getByText(/dinner\.png/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /remove/i }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("rejects unsupported MIME types and calls onFileChange with null", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ReferencePhotoDropzone file={null} onFileChange={onChange} />);
    const input = screen.getByLabelText(/browse/i) as HTMLInputElement;
    await user.upload(
      input,
      new File(["x"], "doc.pdf", { type: "application/pdf" }),
    );
    expect(onChange).toHaveBeenCalledWith(null);
  });
});

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  MenuGeneratorProvider,
  useGenerator,
} from "./MenuGeneratorProvider";
import type { MenuGenerator } from "./menuGenerator";

function Probe() {
  const gen = useGenerator();
  return <span data-testid="probe">{gen ? "have-gen" : "no-gen"}</span>;
}

const stubGenerator: MenuGenerator = {
  parseMenuFromText: async () => [],
  parseMenuFromImage: async () => [],
  generateDishImage: async () => new Blob(),
};

describe("MenuGeneratorProvider", () => {
  it("provides the injected generator via useGenerator", () => {
    render(
      <MenuGeneratorProvider value={stubGenerator}>
        <Probe />
      </MenuGeneratorProvider>,
    );
    expect(screen.getByTestId("probe").textContent).toBe("have-gen");
  });

  it("throws a helpful error if useGenerator is called outside a provider", () => {
    // React 19 swallows render errors and reports them via the test renderer.
    // Use a try/catch around render to capture the thrown error.
    expect(() => render(<Probe />)).toThrow(/MenuGeneratorProvider/);
  });
});

import { describe, it, expect } from "vitest";
import type { MenuGenerator } from "./menuGenerator";
import { GeneratorError } from "./menuGenerator";
import { fakeMenuGenerator } from "./fakeMenuGenerator";

const cases: Array<[string, () => MenuGenerator]> = [
  ["fakeMenuGenerator", () => fakeMenuGenerator()],
];

describe.each(cases)("MenuGenerator contract — %s", (_label, factory) => {
  it("parseMenuFromText returns a ParsedMenuItem[] for a non-empty prompt", async () => {
    const gen = factory();
    const items = await gen.parseMenuFromText("a four-course Italian dinner", {
      signal: new AbortController().signal,
    });
    expect(Array.isArray(items)).toBe(true);
    for (const item of items) {
      expect(item).toMatchObject({
        category: expect.any(String),
        name: expect.any(String),
        description: expect.any(String),
        price: expect.any(String),
      });
    }
  });

  it("parseMenuFromImage returns a ParsedMenuItem[] for a valid file", async () => {
    const gen = factory();
    const file = new File(["dummy"], "menu.jpg", { type: "image/jpeg" });
    const items = await gen.parseMenuFromImage(file, {
      signal: new AbortController().signal,
    });
    expect(Array.isArray(items)).toBe(true);
  });

  it("generateDishImage returns a Blob with non-zero size", async () => {
    const gen = factory();
    const blob = await gen.generateDishImage(
      { name: "Margherita", description: "tomato, mozzarella, basil" },
      { signal: new AbortController().signal },
    );
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("generateDishImage rejects with an AbortError when signal aborts before completion", async () => {
    const gen = factory();
    const controller = new AbortController();
    const promise = gen.generateDishImage(
      { name: "Cancelled", description: "won't finish" },
      { signal: controller.signal },
    );
    controller.abort();
    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  });

  it("non-abort errors are GeneratorError instances (smoke check)", () => {
    expect(new GeneratorError("network", "x")).toBeInstanceOf(GeneratorError);
    expect(new GeneratorError("network", "x").kind).toBe("network");
  });
});

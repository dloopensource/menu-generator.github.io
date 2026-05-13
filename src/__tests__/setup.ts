import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

if (typeof URL.createObjectURL === "undefined") {
  let counter = 0;
  Object.defineProperty(URL, "createObjectURL", {
    value: () => `blob:test-${++counter}`,
    writable: true,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    value: () => undefined,
    writable: true,
  });
}

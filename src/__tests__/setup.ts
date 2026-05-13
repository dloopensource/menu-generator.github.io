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

const OriginalBlob = globalThis.Blob;
Object.defineProperty(globalThis, "Blob", {
  value: class Blob extends OriginalBlob {
    static [Symbol.hasInstance](obj: unknown) {
      return obj instanceof OriginalBlob ||
        (obj && Object.prototype.toString.call(obj) === "[object Blob]");
    }
  },
  writable: true,
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GeneratorError } from "./menuGenerator";

// Mock the SDK at module level so all imports of @google/genai go through it.
vi.mock("@google/genai", () => {
  const generateContent = vi.fn();
  return {
    GoogleGenAI: vi.fn(function () {
      return { models: { generateContent } };
    }),
    __generateContent: generateContent,
  };
});

import { geminiMenuGenerator } from "./geminiMenuGenerator";
// Access the mock fn via the namespace import:
import * as Genai from "@google/genai";
const generateContent = (Genai as unknown as { __generateContent: ReturnType<typeof vi.fn> }).__generateContent;

beforeEach(() => {
  generateContent.mockReset();
});

describe("geminiMenuGenerator error mapping", () => {
  // Per live probe (2026-05-13): the @google/genai SDK throws an ApiError with
  // `status: 400` and a JSON-stringified message body for invalid keys. The body
  // contains `"reason":"API_KEY_INVALID"` and `"status":"INVALID_ARGUMENT"`.
  it("maps API_KEY_INVALID (status 400) SDK errors to GeneratorError(invalid_key)", async () => {
    generateContent.mockRejectedValueOnce({
      name: "ApiError",
      status: 400,
      message: JSON.stringify({
        error: {
          code: 400,
          message: "API key not valid. Please pass a valid API key.",
          status: "INVALID_ARGUMENT",
          details: [{ "@type": "type.googleapis.com/google.rpc.ErrorInfo", reason: "API_KEY_INVALID" }],
        },
      }),
    });
    const gen = geminiMenuGenerator("test-key");
    await expect(
      gen.parseMenuFromText("x", { signal: new AbortController().signal }),
    ).rejects.toMatchObject({
      name: "GeneratorError",
      kind: "invalid_key",
    });
  });

  it("maps 429 RESOURCE_EXHAUSTED to GeneratorError(rate_limited)", async () => {
    generateContent.mockRejectedValueOnce({
      name: "ApiError",
      status: 429,
      message: JSON.stringify({
        error: { code: 429, message: "You exceeded your current quota.", status: "RESOURCE_EXHAUSTED" },
      }),
    });
    const gen = geminiMenuGenerator("test-key");
    await expect(
      gen.parseMenuFromText("x", { signal: new AbortController().signal }),
    ).rejects.toMatchObject({ kind: "rate_limited" });
  });

  // Per the v2.0.1 FinishReason enum there is NO "BLOCKED" value. Image-side
  // safety/recitation/prohibited content surfaces as one of:
  //   IMAGE_SAFETY, IMAGE_PROHIBITED_CONTENT, IMAGE_RECITATION, IMAGE_OTHER, NO_IMAGE
  it.each([
    "IMAGE_SAFETY",
    "IMAGE_PROHIBITED_CONTENT",
    "IMAGE_RECITATION",
    "IMAGE_OTHER",
    "NO_IMAGE",
  ])("maps finishReason %s on the image model to content_blocked", async (reason) => {
    generateContent.mockResolvedValueOnce({
      candidates: [{ finishReason: reason, content: { parts: [] } }],
    });
    const gen = geminiMenuGenerator("test-key");
    await expect(
      gen.generateDishImage(
        { name: "X", description: "Y" },
        { signal: new AbortController().signal },
      ),
    ).rejects.toMatchObject({ kind: "content_blocked" });
  });

  it("parses JSON from a successful text response (via response.text getter)", async () => {
    // The SDK exposes `response.text` as a getter that concatenates all text
    // parts of the first candidate. The impl prefers it over walking parts.
    const jsonText = JSON.stringify([
      { category: "PASTA", name: "X", description: "Y", price: "$10" },
    ]);
    generateContent.mockResolvedValueOnce({
      text: jsonText,
      candidates: [
        {
          finishReason: "STOP",
          content: { parts: [{ text: jsonText }] },
        },
      ],
    });
    const gen = geminiMenuGenerator("test-key");
    const items = await gen.parseMenuFromText("x", {
      signal: new AbortController().signal,
    });
    expect(items).toEqual([
      { category: "PASTA", name: "X", description: "Y", price: "$10" },
    ]);
  });

  it("returns a Blob from an image response with inline image data", async () => {
    // 1x1 transparent PNG, base64
    const pngB64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    generateContent.mockResolvedValueOnce({
      candidates: [
        {
          finishReason: "STOP",
          content: {
            parts: [{ inlineData: { mimeType: "image/png", data: pngB64 } }],
          },
        },
      ],
    });
    const gen = geminiMenuGenerator("test-key");
    const blob = await gen.generateDishImage(
      { name: "X", description: "Y" },
      { signal: new AbortController().signal },
    );
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe("image/png");
  });

  it("never lets a raw SDK error escape — wraps unknowns as GeneratorError(unknown)", async () => {
    generateContent.mockRejectedValueOnce(new TypeError("network blip"));
    const gen = geminiMenuGenerator("test-key");
    await expect(
      gen.parseMenuFromText("x", { signal: new AbortController().signal }),
    ).rejects.toBeInstanceOf(GeneratorError);
  });
});

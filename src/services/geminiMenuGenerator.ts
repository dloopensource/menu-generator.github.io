import { GoogleGenAI, type Part } from "@google/genai";
import type {
  DishPrompt,
  GenerateImageOptions,
  MenuGenerator,
  ParsedMenuItem,
} from "./menuGenerator";
import { GeneratorError, type GeneratorErrorKind } from "./menuGenerator";

const PARSE_MODEL = "gemini-2.5-flash";
const IMAGE_MODEL = "gemini-2.5-flash-image";

const STYLE_PREAMBLE =
  "A warm, naturally lit overhead food photograph on a neutral surface, " +
  "shallow depth of field, restaurant-magazine quality. No text overlay.";

const PARSE_INSTRUCTION =
  "Extract menu items as a JSON array. Each item: " +
  '{"category": string, "name": string, "description": string, "price": string}. ' +
  "Return an empty array if no items are present.";

const PARSE_RESPONSE_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      category: { type: "STRING" },
      name: { type: "STRING" },
      description: { type: "STRING" },
      price: { type: "STRING" },
    },
    required: ["category", "name", "description", "price"],
  },
};

// Per live probe (2026-05-13): the @google/genai SDK throws `ApiError` with
// `status: <int>` and `message: <JSON-stringified body>`. The body has either
// `"reason":"API_KEY_INVALID"` for bad keys (status 400) or
// `"status":"RESOURCE_EXHAUSTED"` for quota (status 429). Match against the
// stringified message so we don't have to re-parse the JSON.
function mapError(err: unknown): GeneratorError {
  if (err instanceof GeneratorError) return err;
  const e = err as { status?: number; message?: string };
  const msg = e?.message ?? "";
  let kind: GeneratorErrorKind = "unknown";

  if (e?.status === 400 && /API_KEY_INVALID|api key not valid/i.test(msg)) {
    kind = "invalid_key";
  } else if (e?.status === 401 || e?.status === 403) {
    // Defensive: handle legacy 401/403 in case the API changes.
    kind = "invalid_key";
  } else if (e?.status === 429) {
    kind = "rate_limited";
  } else if (err instanceof TypeError) {
    kind = "network";
  }

  // Friendlier message for rate-limit on the image model — free-tier projects
  // hit this immediately because image generation requires billing.
  const userMessage =
    kind === "rate_limited"
      ? "Gemini quota exceeded. Image generation requires a Google Cloud project with billing enabled."
      : msg || "Unknown error";

  return new GeneratorError(kind, userMessage);
}

const CONTENT_BLOCKED_FINISH_REASONS = new Set([
  // Image model
  "IMAGE_SAFETY",
  "IMAGE_PROHIBITED_CONTENT",
  "IMAGE_RECITATION",
  "IMAGE_OTHER",
  "NO_IMAGE",
  // Text model (shouldn't trigger from generateDishImage but defensive)
  "SAFETY",
  "PROHIBITED_CONTENT",
  "BLOCKLIST",
  "SPII",
]);

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToBlob(b64: string, mimeType: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

function abortError(): Error {
  const e = new Error("Aborted");
  e.name = "AbortError";
  return e;
}

// Vitest's vi.fn().mockImplementation(arrowFn) cannot be invoked with `new`
// (Reflect.construct requires a real constructor). Calling without `new` first
// lets the test mock work; the real SDK throws, so we re-try with `new`.
function createGenAI(apiKey: string) {
  try {
    return (GoogleGenAI as unknown as (o: { apiKey: string }) => InstanceType<typeof GoogleGenAI>)({ apiKey });
  } catch {
    return new GoogleGenAI({ apiKey });
  }
}

export function geminiMenuGenerator(apiKey: string): MenuGenerator {
  const ai = createGenAI(apiKey);

  async function parseFromParts(parts: Part[], signal: AbortSignal) {
    if (signal.aborted) throw abortError();
    try {
      const response = await ai.models.generateContent({
        model: PARSE_MODEL,
        contents: [{ role: "user", parts }],
        config: {
          responseMimeType: "application/json",
          responseSchema: PARSE_RESPONSE_SCHEMA,
        },
      });
      // SDK v2.x exposes `response.text` getter that concatenates all text
      // parts of the first candidate. Verified against probe (2026-05-13).
      const text =
        (response as { text?: string })?.text ??
        response?.candidates?.[0]?.content?.parts?.[0]?.text ??
        "";
      if (!text) return [];
      const parsed = JSON.parse(text) as ParsedMenuItem[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      throw mapError(err);
    }
  }

  return {
    async parseMenuFromText(prompt, opts) {
      return parseFromParts(
        [{ text: `${PARSE_INSTRUCTION}\n\nPrompt:\n${prompt}` }],
        opts.signal,
      );
    },

    async parseMenuFromImage(file, opts) {
      const data = await fileToBase64(file);
      return parseFromParts(
        [
          { text: PARSE_INSTRUCTION },
          { inlineData: { mimeType: file.type || "image/jpeg", data } },
        ],
        opts.signal,
      );
    },

    async generateDishImage(input: DishPrompt, opts: GenerateImageOptions) {
      if (opts.signal.aborted) throw abortError();
      try {
        const prompt =
          (input.styleHint ?? STYLE_PREAMBLE) +
          "\n\nDish: " +
          input.name +
          "\nDescription: " +
          input.description;
        const response = await ai.models.generateContent({
          model: IMAGE_MODEL,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: { responseModalities: ["IMAGE"] },
        });
        const candidate = response?.candidates?.[0];
        const finishReason = candidate?.finishReason as string | undefined;
        if (finishReason && CONTENT_BLOCKED_FINISH_REASONS.has(finishReason)) {
          throw new GeneratorError(
            "content_blocked",
            `Image was blocked (finishReason=${finishReason}).`,
          );
        }
        const part = candidate?.content?.parts?.find(
          (p: unknown) => (p as { inlineData?: unknown }).inlineData,
        ) as { inlineData?: { mimeType: string; data: string } } | undefined;
        if (!part?.inlineData?.data) {
          throw new GeneratorError("unknown", "Image response contained no inline data.");
        }
        return base64ToBlob(part.inlineData.data, part.inlineData.mimeType ?? "image/png");
      } catch (err) {
        throw mapError(err);
      }
    },
  };
}

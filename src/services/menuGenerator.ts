export type ParsedMenuItem = {
  category: string;
  name: string;
  description: string;
  price: string;
};

export type DishPrompt = {
  name: string;
  description: string;
  styleHint?: string;
};

export type GenerateImageOptions = {
  signal: AbortSignal;
};

export type GeneratorErrorKind =
  | "invalid_key"
  | "rate_limited"
  | "content_blocked"
  | "network"
  | "unknown";

export class GeneratorError extends Error {
  readonly kind: GeneratorErrorKind;
  constructor(kind: GeneratorErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = "GeneratorError";
  }
}

export interface MenuGenerator {
  parseMenuFromText(
    prompt: string,
    opts: { signal: AbortSignal },
  ): Promise<ParsedMenuItem[]>;

  parseMenuFromImage(
    file: File,
    opts: { signal: AbortSignal },
  ): Promise<ParsedMenuItem[]>;

  generateDishImage(
    input: DishPrompt,
    opts: GenerateImageOptions,
  ): Promise<Blob>;
}

export const blankParsedMenuItem = (): ParsedMenuItem => ({
  category: "",
  name: "",
  description: "",
  price: "",
});

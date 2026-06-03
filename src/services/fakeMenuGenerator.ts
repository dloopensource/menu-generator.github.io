import type {
  DishPrompt,
  GenerateImageOptions,
  MenuGenerator,
  ParsedMenuItem,
} from "./menuGenerator";

const MOCKUP_ITEMS: ParsedMenuItem[] = [
  {
    category: "PASTA",
    name: "Rigatoni all'Amatriciana",
    description:
      "Slow-stewed sun marzano, crisped guanciale, a whisper of chili.",
    price: "$25",
  },
  {
    category: "MAIN",
    name: "Branzino in Cartoccio",
    description:
      "Whole branzino baked in parchment, fennel, taggiasche olives.",
    price: "$38",
  },
  {
    category: "ANTIPASTO",
    name: "Burrata di Andria",
    description:
      "Fior-di-latte cream, late-summer tomato, basil oil, sourdough.",
    price: "$18",
  },
  {
    category: "DOLCE",
    name: "Tiramisù della Casa",
    description: "Mascarpone cream, espresso-soaked savoiardi, cocoa veil.",
    price: "$12",
  },
];

const delay = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        const e = new Error("Aborted");
        e.name = "AbortError";
        reject(e);
      },
      { once: true },
    );
  });

const jitter = (min: number, max: number) =>
  Math.floor(min + Math.random() * (max - min));

const hashString = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

export function fakeMenuGenerator(): MenuGenerator {
  return {
    async parseMenuFromText(_prompt, opts) {
      await delay(400, opts.signal);
      return MOCKUP_ITEMS.slice();
    },
    async parseMenuFromImage(_file, opts) {
      await delay(400, opts.signal);
      return MOCKUP_ITEMS.slice();
    },
    async generateDishImage(input: DishPrompt, opts: GenerateImageOptions) {
      await delay(jitter(600, 1200), opts.signal);
      const seed = hashString(`${input.name}|${input.description}`);
      const hue = seed % 360;
      const label = (input.name || "Generated dish")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480">` +
        `<rect width="100%" height="100%" fill="hsl(${hue}, 55%, 65%)"/>` +
        `<text x="50%" y="50%" font-family="Georgia, serif" font-size="36" ` +
        `fill="white" text-anchor="middle" dominant-baseline="middle">${label}</text>` +
        `</svg>`;
      return new Blob([svg], { type: "image/svg+xml" });
    },
  };
}

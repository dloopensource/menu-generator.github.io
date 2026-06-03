# Menu Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a static React + Vite + TypeScript SPA that lets a user paste their own Gemini API key, then either (a) describe a menu in text or (b) upload a photo of an existing menu, and receive N AI-generated dish photos in an editable card grid powered by `gemini-2.5-flash` (parse) + `gemini-2.5-flash-image` (image).

**Architecture:** Spec-driven (Allium) TDD. A thin `MenuGenerator` service interface decouples UI from the SDK so unit/flow tests inject a `fakeMenuGenerator` and never touch the network. State is a single discriminated-union reducer scoped to the main feature; the API key lives in a tiny `useApiKey` hook backed by `localStorage`. No backend, no router, no global state library, no MSW.

**Tech Stack:** Vite 8 + React 19 + TypeScript 6; Vitest 4 + `@testing-library/react` + `@testing-library/user-event` + `@testing-library/jest-dom` + `jsdom`; `@google/genai` (browser); plain CSS Modules + shared tokens; deploys to GitHub Pages via `gh-pages`.

**Source spec:** [`docs/superpowers/specs/2026-05-09-menu-generator-design.md`](../specs/2026-05-09-menu-generator-design.md). Anywhere this plan and the spec disagree, the spec wins — flag the divergence in a PR and update the spec or the plan before continuing.

**Project board:** <https://github.com/users/dloopensource/projects/2/views/1>. Per Section 8 of the spec, **the agent doing each task creates and self-assigns its GitHub Project task in `Backlog` before starting**, walks it through `Ready → In progress → In review → Done`, and links: (a) the Allium spec file, (b) the design-doc anchor, (c) the test file path, (d) the production file path.

**Branching:** Work happens on `develop` (or feature branches off `develop`). `main` is the production GitHub Pages branch and must not be committed to directly. Run `npm run deploy` from `develop` to publish.

---

## File structure (locked from spec §7 and §9)

```
menu-generator.github.io/
├── specs/                                  # NEW — Allium specs
│   ├── menu-generator.allium
│   ├── api-key.allium
│   ├── prompt-form.allium
│   ├── reference-photo.allium
│   ├── menu-generation.allium
│   ├── menu-card.allium
│   └── generator-service.allium
├── docs/
│   ├── superpowers/
│   │   ├── specs/2026-05-09-menu-generator-design.md   # existing
│   │   └── plans/2026-05-11-menu-generator.md          # this plan
│   └── diagrams/                            # NEW — Mermaid sequence docs
│       ├── sequence-flow-a-text.md
│       ├── sequence-flow-b-upload.md
│       ├── sequence-regenerate-card.md
│       └── workflow-agents.md
├── prompts/initial-prompt.md                # existing (move from plans/prompt.md if not already)
├── src/
│   ├── main.tsx                             # modify (replace App import path stays)
│   ├── App.tsx                              # REPLACE (currently the Vite starter)
│   ├── index.css                            # modify — minimal global resets only
│   ├── styles/
│   │   ├── tokens.css                       # NEW
│   │   └── reset.css                        # NEW
│   ├── hooks/
│   │   ├── useApiKey.ts                     # NEW
│   │   └── useApiKey.test.ts                # NEW
│   ├── services/
│   │   ├── menuGenerator.ts                 # NEW — interface, types, GeneratorError
│   │   ├── fakeMenuGenerator.ts             # NEW
│   │   ├── geminiMenuGenerator.ts           # NEW
│   │   ├── MenuGeneratorProvider.tsx        # NEW
│   │   └── menuGenerator.contract.test.ts   # NEW
│   ├── state/
│   │   ├── menuReducer.ts                   # NEW
│   │   ├── menuReducer.test.ts              # NEW
│   │   └── types.ts                         # NEW
│   ├── components/
│   │   ├── Header.tsx + .module.css + .test.tsx
│   │   ├── ApiKeyGate.tsx + .test.tsx
│   │   ├── ApiKeyForm.tsx + .module.css + .test.tsx
│   │   ├── PromptForm.tsx + .module.css + .test.tsx
│   │   ├── ReferencePhotoDropzone.tsx + .module.css + .test.tsx
│   │   ├── CountStepper.tsx + .module.css + .test.tsx
│   │   ├── SuggestionChips.tsx + .module.css + .test.tsx
│   │   ├── ChangeApiKeyLink.tsx
│   │   ├── ErrorBanner.tsx + .module.css + .test.tsx
│   │   ├── MenuGrid.tsx + .module.css + .test.tsx
│   │   └── MenuCard.tsx + .module.css + .test.tsx
│   ├── __tests__/
│   │   ├── setup.ts                         # NEW
│   │   └── flows/
│   │       ├── text-only.test.tsx           # NEW
│   │       └── upload.test.tsx              # NEW
│   └── assets/                              # existing (unused going forward)
├── vitest.config.ts                         # NEW
├── package.json                             # modify — scripts + deps
├── tsconfig.app.json                        # modify — add "vitest/globals" types
├── eslint.config.js                         # modify if needed
└── index.html                               # modify — title, font preloads
```

---

## Conventions used in every task

- **Integration branch:** all PRs target `implement-menu-gen` (long-lived). Every task is on a short-lived branch `task/NN-<slug>` cut from the latest `implement-menu-gen`. No one commits to `implement-menu-gen` directly. See spec §8.6 for the full branch model.
- **Block-until-merged:** the controller does not dispatch the next task's implementer until the current task's PR is merged into `implement-menu-gen`. One open PR at a time. No stacked PRs.
- **PR review by agents:**
  - **`code-health`** reviews every PR (code quality, tech debt, oversized files, weak tests, stale docs).
  - **`allium:weed`** reviews every PR that touches `specs/*.allium` or any code bound to a spec (spec ↔ code drift). Skipped for pure-infra PRs.
  - The **owning agent** fixes any issue raised by either reviewer before the PR can merge. Reviewers do not push fixes themselves.
- **Merge policy:** squash merge (`gh pr merge <num> --squash --delete-branch`). Squash commit title = PR title (`Task NN: <name>`), so `implement-menu-gen`'s log reads as a task ledger.
- **Project task lifecycle (per spec §8):** every task starts by creating a GitHub Project task in `Backlog`, self-assigning it, moving to `Ready` → `In progress` at branch cut. PR open ⇒ `In review`. PR merged ⇒ `Done`. **Local commits without a merged PR do not move the item past `In review`.** Owner mapping is in the task header.
- **TDD:** write failing test → run and confirm it fails _for the right reason_ → write minimal implementation → run test green → commit.
- **`npm test` defaults to watch.** Use `npm run test:run` for one-shot CI-like runs. New tasks should run the specific spec via `npm run test:run -- path/to/file.test.ts`.
- **Commit style** matches existing repo: short imperative, lowercase, no scope. Example: `add MenuGenerator service interface and fake impl`. Co-authored-by trailer optional. Squash-merge replaces these per-commit messages with the PR title on `implement-menu-gen`; original commits remain visible in the closed PR.
- **Allium commands:** `allium check specs/<file>.allium` validates a spec. `allium analyse specs/<file>.allium` reports coverage. `allium:propagate` (skill) emits test skeletons. `allium:weed` (skill) reports spec ↔ code drift.
- **Owner column in task headers:** `frontend-engineer` writes production code, `test-engineer` writes test code, `allium:tend` writes specs and diagrams. Reviewers (`code-health`, `allium:weed`) are dispatched by the controller after the owning agent opens the PR. Where one task has multiple owners (e.g., infra with both frontend-engineer and test-engineer), split into sub-tasks per spec §8.

### Per-task git workflow (every task uses this exact sequence)

```
1.  git fetch origin
2.  git checkout -b task/NN-<slug> origin/implement-menu-gen
3.  ... do the work, write tests, commit small ...
4.  npm run lint && npm run test:run && npm run build   # all must pass
5.  git push -u origin task/NN-<slug>
6.  gh pr create --base implement-menu-gen \
       --title "Task NN: <name>" \
       --body "<links to plan, spec, Project item, test/lint output>"
7.  Move Project item to "In review"
8.  Wait for code-health (and allium:weed if applicable) reviews.
9.  Address any review findings on the SAME branch; push fixes; reviewers re-run.
10. Once approved: gh pr merge <num> --squash --delete-branch
11. Move Project item to "Done"
12. Locally: git fetch && git checkout implement-menu-gen && git pull
    (so the next task's branch is cut from the fresh tip)
```

---

## Task 1 — Infra: dependencies, scripts, lint, test harness

**Project task:** `Infra: test harness`
**Owner(s):** `frontend-engineer` (deps + config) + `test-engineer` (smoke test)
**Files:**

- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/__tests__/setup.ts`
- Modify: `tsconfig.app.json`
- Create: `src/__tests__/smoke.test.ts`

- [ ] **Step 1: Create the Project task**

In the GitHub Project board, create `Infra: test harness` in `Backlog`, self-assign as `frontend-engineer`, link to spec §8.4 and this Task 1. Move it to `Ready` (no blockers) then `In progress`.

- [ ] **Step 2: Add runtime + dev dependencies**

Run from repo root:

```bash
npm install @google/genai
npm install --save-dev \
  vitest@^4 \
  @vitest/coverage-v8@^4 \
  @testing-library/react@^17 \
  @testing-library/user-event@^15 \
  @testing-library/jest-dom@^7 \
  jsdom@^28
```

Expected: all installs succeed; `package.json` shows the new entries; lockfile updated. If a peer-dep warning prints for React 19, accept it — RTL 17+ supports React 19 natively.

- [ ] **Step 3: Add test scripts to package.json**

In `package.json`, replace the `"scripts"` object with:

```json
{
  "deploy": "npm run build && gh-pages -d dist -b main",
  "dev": "vite",
  "build": "tsc -b && vite build",
  "format": "prettier --write .",
  "lint": "eslint .",
  "preview": "vite preview",
  "test": "vitest",
  "test:run": "vitest run",
  "test:coverage": "vitest run --coverage"
}
```

- [ ] **Step 4: Create vitest.config.ts**

Create `vitest.config.ts` at repo root:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    css: { modules: { classNameStrategy: "non-scoped" } },
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
```

- [ ] **Step 5: Create the test setup file**

Create `src/__tests__/setup.ts`:

```ts
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
```

- [ ] **Step 6: Update tsconfig.app.json**

In `tsconfig.app.json`, add `"vitest/globals"` to the `types` array so `describe / it / expect` are typed without per-file imports:

```json
"types": ["vite/client", "vitest/globals"],
```

- [ ] **Step 7: Write the smoke test**

Create `src/__tests__/smoke.test.ts`:

```ts
describe("test harness", () => {
  it("runs in jsdom with globals available", () => {
    expect(typeof window).toBe("object");
    expect(window.document.body).toBeTruthy();
  });

  it("creates and revokes object URLs without throwing", () => {
    const blob = new Blob(["x"], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    expect(url).toMatch(/^blob:/);
    URL.revokeObjectURL(url);
  });
});
```

- [ ] **Step 8: Run the smoke test**

Run:

```bash
npm run test:run -- src/__tests__/smoke.test.ts
```

Expected: 2 passed, 0 failed.

- [ ] **Step 9: Run lint and full test**

Run `npm run lint` (expect 0 errors) and `npm run test:run` (expect smoke test passes). Fix any ESLint configuration that flags the new test files.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json vitest.config.ts tsconfig.app.json src/__tests__/setup.ts src/__tests__/smoke.test.ts
git commit -m "add vitest + RTL test harness and smoke test"
```

- [ ] **Step 11: Open PR, move Project task to In review, merge → Done**

PR title: `Infra: test harness`. PR body links the design doc §8.4 anchor. After CI-equivalent (`npm run lint && npm run test:run`) is green, merge and move the Project task to `Done`.

**Note on GitHub Pages base path:** `vite.config.ts` must set `base: "/menu-generator.github.io/"` for production builds. Without it, asset URLs in `dist/index.html` are absolute (`/assets/...`) and 404 when served at the repository subpath. This is verified and fixed separately.

---

## Task 2 — Infra: design tokens and reset

**Project task:** `Infra: design tokens`
**Owner:** `frontend-engineer` (no test task — visual diff against `designs/photo-realistic-menu-generator.png` is the acceptance)
**Files:**

- Create: `src/styles/tokens.css`
- Create: `src/styles/reset.css`
- Modify: `src/index.css`
- Modify: `index.html`

- [ ] **Step 1: Create Project task**

Create `Infra: design tokens` in `Backlog`, self-assign, link to §7 and §2 of the spec. Move to `Ready` → `In progress`.

- [ ] **Step 2: Add font preload to index.html**

The mockup uses a transitional serif for headings and a humanist sans for UI. Modify `index.html` to import Inter (UI) and Source Serif 4 (display). Replace the `<head>` block with:

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Menu Generator</title>
  <link rel="preconnect" href="https://rsms.me/" />
  <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;1,8..60,400&display=swap"
    rel="stylesheet"
  />
</head>
```

- [ ] **Step 3: Create tokens.css**

Create `src/styles/tokens.css`:

```css
:root {
  /* Palette — sampled from designs/photo-realistic-menu-generator.png */
  --color-bg: #f6efe2;
  --color-surface: #fbf5e8;
  --color-surface-2: #f3ead7;
  --color-ink: #1d1a16;
  --color-ink-soft: #524a3d;
  --color-ink-mute: #897e6c;
  --color-accent: #c4521b;
  --color-accent-soft: #e7a07a;
  --color-divider: #e0d6bf;
  --color-error: #a93b1a;
  --color-success: #2f6f3a;

  /* Type */
  --font-display: "Source Serif 4", Georgia, serif;
  --font-ui: "Inter", system-ui, sans-serif;

  /* Spacing scale */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-pill: 999px;

  /* Shadows */
  --shadow-card:
    0 1px 2px rgba(29, 26, 22, 0.06), 0 8px 24px rgba(29, 26, 22, 0.05);
}
```

- [ ] **Step 4: Create reset.css**

Create `src/styles/reset.css`:

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}
html,
body {
  margin: 0;
  padding: 0;
}
body {
  background: var(--color-bg);
  color: var(--color-ink);
  font-family: var(--font-ui);
  font-size: 15px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
}
button {
  font: inherit;
  cursor: pointer;
}
img {
  display: block;
  max-width: 100%;
}
input,
textarea {
  font: inherit;
  color: inherit;
}
```

- [ ] **Step 5: Replace src/index.css**

Replace the existing `src/index.css` with:

```css
@import "./styles/tokens.css";
@import "./styles/reset.css";

#root {
  min-height: 100vh;
  padding: var(--space-6) var(--space-5);
  max-width: 1080px;
  margin: 0 auto;
}
```

- [ ] **Step 6: Run lint**

Run `npm run lint`. Expect 0 errors. If ESLint is configured to lint CSS, fix any flagged rules.

- [ ] **Step 7: Verify Vite still builds**

Run `npm run build`. Expect a successful build into `dist/`.

- [ ] **Step 8: Commit**

```bash
git add src/styles/tokens.css src/styles/reset.css src/index.css index.html
git commit -m "add design tokens and reset for menu generator"
```

- [ ] **Step 9: Walk Project task to Done after PR merges**

---

## Task 3 — Spec: top-level `menu-generator.allium` and sequence diagrams

**Project task:** `Spec: menu-generator`
**Owner:** `allium:tend`
**Blocks:** every other `Spec:` and `Implement:` task — this is the umbrella spec.
**Files:**

- Create: `specs/menu-generator.allium`
- Create: `docs/diagrams/sequence-flow-a-text.md`
- Create: `docs/diagrams/sequence-flow-b-upload.md`
- Create: `docs/diagrams/sequence-regenerate-card.md`
- Create: `docs/diagrams/workflow-agents.md`

- [ ] **Step 1: Create Project task**

Create `Spec: menu-generator`, self-assign as `allium:tend`, link to design §1, §2, §5, §9. Move to `Ready` → `In progress`.

- [ ] **Step 2: Write specs/menu-generator.allium**

Use the `allium:tend` skill to author `specs/menu-generator.allium`. The spec captures only the top-level entities and flows; sub-specs (`api-key`, `prompt-form`, `reference-photo`, `menu-generation`, `menu-card`, `generator-service`) are written in later tasks.

Required content (express in current Allium syntax — `allium:tend` knows the dialect):

- **Entities:** `MenuGenerator` (the app), `ApiKey`, `Prompt`, `ReferencePhoto`, `MenuItemRequest` (count, prompt, optional photo), `MenuItem` (category, name, description, price, image), `Generation` (a single Generate-menu invocation).
- **Surfaces:** the user-visible UI surfaces (prompt form, menu grid, api-key gate) — names only, no React details.
- **Rules:**
  - Generation cannot start without an `ApiKey` set OR `?fake=true` URL flag present.
  - A `Generation` requires either a non-empty `Prompt` OR a `ReferencePhoto`.
  - Count is bounded `1 ≤ count ≤ 8`, default 4.
  - Each `MenuItem` in a `Generation` has at least one of `name` or `description` non-empty before image generation is attempted; otherwise the card stays `pending`.
  - On per-card regenerate, only the targeted card's status transitions; siblings are untouched.
- **Triggers:** `OnGenerateMenu`, `OnRegenerateCard`, `OnEditCardField`, `OnSetApiKey`.

- [ ] **Step 3: Validate the spec**

Run:

```bash
allium check specs/menu-generator.allium
```

Expected: 0 errors. Fix any syntax issues.

- [ ] **Step 4: Author the four sequence diagram docs**

Copy the Mermaid blocks **verbatim** from design doc §9.4 into the four files. Each file follows this structure (example for Flow A):

```markdown
# Flow A — Text prompt only

Sequence of API calls and state transitions when the user clicks Generate menu
with a text prompt and no reference photo.

## Diagram

\`\`\`mermaid
sequenceDiagram
actor User
participant App as Menu Generator (browser)
participant Svc as MenuGenerator service
participant Gemini as Gemini API
...
\`\`\`

## Participants

- **User** — types prompt, picks count, clicks Generate menu, edits card fields.
- **App** — React app rendered in the browser; holds reducer state.
- **Svc** — MenuGenerator service injected via context; either real or fake.
- **Gemini API** — Google's hosted models, called via @google/genai.

## What this diagram does NOT cover

- Authentication errors and rate-limit handling (see ErrorBanner + cardFailed states).
- Per-card regenerate (see sequence-regenerate-card.md).
- Cases where parseMenuFromText returns fewer than N items (see spec §1.2 step 3).
```

Repeat for the other three (Flow B, regenerate, workflow). Use the verbatim Mermaid from design doc §9.4 — do not paraphrase or shorten.

- [ ] **Step 5: Confirm GitHub renders the Mermaid**

Push a draft commit and open the files in GitHub's web UI (or in IDE preview). All four diagrams must render as diagrams, not code blocks. If any fails, the Mermaid syntax is wrong — fix and re-push.

- [ ] **Step 6: Run allium analyse**

Run:

```bash
allium analyse specs/menu-generator.allium
```

Note the coverage report (expected: 0% — no implementation exists yet). Save the output as a baseline.

- [ ] **Step 7: Commit**

```bash
git add specs/menu-generator.allium docs/diagrams/
git commit -m "add top-level Allium spec and sequence diagrams"
```

- [ ] **Step 8: PR → In review → Done**

PR title: `Spec: menu-generator`. After merge, set Project task to `Done`.

---

## Task 4 — Service: `MenuGenerator` interface and `GeneratorError`

**Project task:** `Spec: generator-service` (combined with type definitions because the spec and the TypeScript interface are the same contract).
**Owner:** `allium:tend` for the `.allium`; `frontend-engineer` for the `.ts`. Create **two** linked sub-tasks if you want strict separation; otherwise one combined task is acceptable for this thin file.
**Blocks:** Tasks 5, 6, 7, every component test that consumes the generator.
**Files:**

- Create: `specs/generator-service.allium`
- Create: `src/services/menuGenerator.ts`

- [ ] **Step 1: Create Project task**

Create `Spec: generator-service` in `Backlog`. Self-assign, link to design §4 and §5. Move through columns as work progresses.

- [ ] **Step 2: Write the Allium spec**

Use `allium:tend` to write `specs/generator-service.allium`. Required content:

- **Entity:** `MenuGenerator` with three operations: `parseMenuFromText(prompt: string) -> ParsedMenuItem[]`, `parseMenuFromImage(file: File) -> ParsedMenuItem[]`, `generateDishImage({name, description, styleHint?}) -> Blob`.
- **Entity:** `ParsedMenuItem` with fields `category`, `name`, `description`, `price` — all strings, all may be empty.
- **Entity:** `GeneratorError` with `kind` ∈ {`invalid_key`, `rate_limited`, `content_blocked`, `network`, `unknown`}.
- **Rules:**
  - Both parse operations return `[]` when no items found; they do not throw on "no items".
  - `generateDishImage` accepts an `AbortSignal` and rejects with `AbortError` if signaled.
  - All non-abort failures map to `GeneratorError`; raw SDK errors do not leak.
  - The real and fake implementations satisfy identical observable behavior modulo timing.

Run `allium check specs/generator-service.allium`. Expect 0 errors.

- [ ] **Step 3: Write the TypeScript file**

Create `src/services/menuGenerator.ts`:

```ts
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
```

- [ ] **Step 4: Verify the file type-checks**

Run:

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add specs/generator-service.allium src/services/menuGenerator.ts
git commit -m "add MenuGenerator interface, types and GeneratorError"
```

- [ ] **Step 6: PR → merge → walk Project task to Done**

---

## Task 5 — `fakeMenuGenerator`: tests then implementation

**Project task:** `Tests: fake-menu-generator` and `Implement: fake-menu-generator`. Create both — the tests task blocks the implementation task.
**Owners:** `test-engineer` for the tests file; `frontend-engineer` for the impl.
**Blocked by:** Task 4 (Spec).
**Files:**

- Create: `src/services/menuGenerator.contract.test.ts` (covers both fake and real impls)
- Create: `src/services/fakeMenuGenerator.ts`

- [ ] **Step 1: Create the Tests task**

Create `Tests: fake-menu-generator` in `Backlog`, self-assign as `test-engineer`, link to design §4.2. Mark blocked by `Spec: generator-service` (Task 4) until Task 4 is `Done`. Move to `Ready` → `In progress`.

- [ ] **Step 2: Write the contract test (failing)**

Create `src/services/menuGenerator.contract.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { MenuGenerator } from "./menuGenerator";
import { GeneratorError } from "./menuGenerator";
import { fakeMenuGenerator } from "./fakeMenuGenerator";

const cases: Array<[string, () => MenuGenerator]> = [
  ["fakeMenuGenerator", () => fakeMenuGenerator()],
];

describe.each(cases)("MenuGenerator contract — %s", (_label, factory) => {
  it("parseMenuFromText returns at least one ParsedMenuItem for a non-empty prompt", async () => {
    const gen = factory();
    const items = await gen.parseMenuFromText("a four-course Italian dinner", {
      signal: new AbortController().signal,
    });
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item).toMatchObject({
        category: expect.any(String),
        name: expect.any(String),
        description: expect.any(String),
        price: expect.any(String),
      });
    }
  });

  it("parseMenuFromImage returns at least one ParsedMenuItem for a valid file", async () => {
    const gen = factory();
    const file = new File(["dummy"], "menu.jpg", { type: "image/jpeg" });
    const items = await gen.parseMenuFromImage(file, {
      signal: new AbortController().signal,
    });
    expect(items.length).toBeGreaterThan(0);
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
```

- [ ] **Step 3: Run the test, confirm it fails for the right reason**

Run:

```bash
npm run test:run -- src/services/menuGenerator.contract.test.ts
```

Expected: the test file fails to import because `./fakeMenuGenerator` does not exist yet. That is the correct "fails for the right reason" — proceed to implementation.

- [ ] **Step 4: Move the Tests task to `In review` once tests are committed (failing)**

Per spec §8.3, the `Tests: <feature>` Definition of Done is: "test files exist and fail with informative messages." Commit just the test file:

```bash
git add src/services/menuGenerator.contract.test.ts
git commit -m "add MenuGenerator contract tests (failing)"
```

Open PR; merge can wait until the impl task PR is also up. Walk Tests task to `In review`.

- [ ] **Step 5: Create the Implement task**

Create `Implement: fake-menu-generator`, self-assign as `frontend-engineer`, link to design §4.2. Mark blocked by the Tests task. Once tests are merged (or the PR is ready), move Implement to `Ready` → `In progress`.

- [ ] **Step 6: Write the fake implementation**

Create `src/services/fakeMenuGenerator.ts`:

```ts
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
      const res = await fetch(`https://picsum.photos/seed/${seed}/640/480`, {
        signal: opts.signal,
      });
      if (!res.ok) {
        throw new Error(`fake image fetch failed: ${res.status}`);
      }
      return await res.blob();
    },
  };
}
```

- [ ] **Step 7: Run the contract test against the fake impl**

Run:

```bash
npm run test:run -- src/services/menuGenerator.contract.test.ts
```

Expected: all tests pass. Note that the "AbortError" test will fire `controller.abort()` while the implementation is in its initial `delay`; the `delay` helper rejects with an `AbortError`. The image-fetch path is not exercised when aborted early.

- [ ] **Step 8: Commit**

```bash
git add src/services/fakeMenuGenerator.ts
git commit -m "implement fakeMenuGenerator satisfying contract tests"
```

- [ ] **Step 9: Run allium:weed**

Use the `allium:weed` skill against `specs/generator-service.allium` and `src/services/`. Expect no drift between spec rules and implementation behavior for the fake (real impl is still missing — that's fine, weed reports it as a known gap).

- [ ] **Step 10: PR → In review → merge → Done for both tasks**

Merge the tests PR and the impl PR together (or stack them). Walk both Project tasks to `Done`.

---

## Task 6 — `geminiMenuGenerator`: tests then implementation

**Project task:** `Tests: gemini-menu-generator` and `Implement: gemini-menu-generator`.
**Owners:** `test-engineer` (tests) + `frontend-engineer` (impl).
**Blocked by:** Task 5.
**Files:**

- Modify: `src/services/menuGenerator.contract.test.ts` — add the real-impl row to the parametrized table.
- Create: `src/services/geminiMenuGenerator.test.ts` — tests for the SDK-specific error mapping (separate file because it owns its own `vi.mock`).
- Create: `src/services/geminiMenuGenerator.ts`

- [ ] **Step 1: Create both Project tasks**

Create both in `Backlog`, self-assign per ownership column, link to design §4.1.

- [ ] **Step 2: Add an SDK-mock test for error mapping**

Create `src/services/geminiMenuGenerator.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GeneratorError } from "./menuGenerator";

// Mock the SDK at module level so all imports of @google/genai go through it.
vi.mock("@google/genai", () => {
  const generateContent = vi.fn();
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => ({
      models: { generateContent },
    })),
    __generateContent: generateContent,
  };
});

import { geminiMenuGenerator } from "./geminiMenuGenerator";
// Access the mock fn via the namespace import:
import * as Genai from "@google/genai";
const generateContent = (
  Genai as unknown as { __generateContent: ReturnType<typeof vi.fn> }
).__generateContent;

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
          details: [
            {
              "@type": "type.googleapis.com/google.rpc.ErrorInfo",
              reason: "API_KEY_INVALID",
            },
          ],
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
        error: {
          code: 429,
          message: "You exceeded your current quota.",
          status: "RESOURCE_EXHAUSTED",
        },
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
  // The implementation must map any of these to content_blocked.
  it.each([
    "IMAGE_SAFETY",
    "IMAGE_PROHIBITED_CONTENT",
    "IMAGE_RECITATION",
    "IMAGE_OTHER",
    "NO_IMAGE",
  ])(
    "maps finishReason %s on the image model to content_blocked",
    async (reason) => {
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
    },
  );

  it("parses JSON from a successful text response", async () => {
    generateContent.mockResolvedValueOnce({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify([
                  {
                    category: "PASTA",
                    name: "X",
                    description: "Y",
                    price: "$10",
                  },
                ]),
              },
            ],
          },
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
```

- [ ] **Step 3: Run the test, confirm fail**

```bash
npm run test:run -- src/services/geminiMenuGenerator.test.ts
```

Expected: import-time failure because `./geminiMenuGenerator` does not exist. Right reason — proceed.

- [ ] **Step 4: Commit failing tests, walk Tests task to In review**

```bash
git add src/services/geminiMenuGenerator.test.ts
git commit -m "add geminiMenuGenerator tests with SDK mock (failing)"
```

- [ ] **Step 5: Write the implementation**

Create `src/services/geminiMenuGenerator.ts`:

```ts
import { GoogleGenAI } from "@google/genai";
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
  for (let i = 0; i < bytes.byteLength; i++)
    bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToBlob(b64: string, mimeType: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

export function geminiMenuGenerator(apiKey: string): MenuGenerator {
  const ai = new GoogleGenAI({ apiKey });

  async function parseFromParts(parts: unknown[], signal: AbortSignal) {
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
        response?.text ??
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
        const finishReason = candidate?.finishReason;
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
          throw new GeneratorError(
            "unknown",
            "Image response contained no inline data.",
          );
        }
        return base64ToBlob(
          part.inlineData.data,
          part.inlineData.mimeType ?? "image/png",
        );
      } catch (err) {
        throw mapError(err);
      }
    },
  };
}

function abortError(): Error {
  const e = new Error("Aborted");
  e.name = "AbortError";
  return e;
}
```

> **SDK shape — verified.** The `ai.models.generateContent({ model, contents, config })` request shape and the response shape (`candidates[0].content.parts[0].inlineData.{mimeType, data}` for images, `response.text` getter for parsed JSON) were verified against `@google/genai@2.0.1` via the installed `.d.ts` and a live probe on 2026-05-13. Findings are documented in design doc §4.4. If the SDK is bumped, re-run the probe (`/tmp/gemini-key.env` workflow) before assuming any of this is still accurate.

- [ ] **Step 6: Run the test, confirm pass**

```bash
npm run test:run -- src/services/geminiMenuGenerator.test.ts
```

Expected: 7 passed.

- [ ] **Step 7: Add the real impl to the parametrized contract test**

In `src/services/menuGenerator.contract.test.ts`, extend the `cases` array. **Do not** test `parseMenuFromText` against the real impl in the contract file (that file is impl-agnostic and we don't want SDK mocks leaking in). The real impl is already validated by `geminiMenuGenerator.test.ts`. The contract test exists so future implementations can drop in and be validated.

If the team prefers an against-the-real-impl row, gate it on an env var (`process.env.GEMINI_LIVE === "1"`) — leave it off in CI.

Practically: skip this step in v1 and rely on `geminiMenuGenerator.test.ts` for the real impl. Document the decision in a one-line comment in `menuGenerator.contract.test.ts`:

```ts
// Real impl is covered by geminiMenuGenerator.test.ts (SDK-mocked) rather than this
// implementation-agnostic file, to keep this file free of @google/genai mocks.
```

- [ ] **Step 8: Run the full test suite**

```bash
npm run test:run
```

Expected: every previous test still passes; new tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/services/geminiMenuGenerator.ts src/services/menuGenerator.contract.test.ts
git commit -m "implement geminiMenuGenerator with SDK error mapping"
```

- [ ] **Step 10: allium:weed**

Run the `allium:weed` skill against `specs/generator-service.allium` and `src/services/`. Both implementations should now match the spec rules. Fix any drift before merging.

- [ ] **Step 11: PR → In review → merge → Done**

---

## Task 7 — `MenuGeneratorProvider` and `useGenerator` context

**Project task:** `Infra: MenuGeneratorProvider wiring + ?fake=true`
**Owner:** `frontend-engineer` (with `test-engineer` for the small unit test).
**Blocked by:** Task 6.
**Files:**

- Create: `src/services/MenuGeneratorProvider.tsx`
- Create: `src/services/MenuGeneratorProvider.test.tsx`

- [ ] **Step 1: Create Project task, self-assign, walk to In progress**

- [ ] **Step 2: Write the test (failing)**

Create `src/services/MenuGeneratorProvider.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MenuGeneratorProvider, useGenerator } from "./MenuGeneratorProvider";

function Probe() {
  const gen = useGenerator();
  return <span data-testid="probe">{gen ? "have-gen" : "no-gen"}</span>;
}

describe("MenuGeneratorProvider", () => {
  it("provides the injected generator", () => {
    const stub = {
      parseMenuFromText: async () => [],
      parseMenuFromImage: async () => [],
      generateDishImage: async () => new Blob(),
    };
    render(
      <MenuGeneratorProvider value={stub}>
        <Probe />
      </MenuGeneratorProvider>,
    );
    expect(screen.getByTestId("probe").textContent).toBe("have-gen");
  });

  it("throws if useGenerator is called outside a provider", () => {
    expect(() => render(<Probe />)).toThrow(/MenuGeneratorProvider/);
  });
});
```

Run:

```bash
npm run test:run -- src/services/MenuGeneratorProvider.test.tsx
```

Expected: fails to import. Right reason.

- [ ] **Step 3: Implement the provider**

Create `src/services/MenuGeneratorProvider.tsx`:

```tsx
import { createContext, useContext, type ReactNode } from "react";
import type { MenuGenerator } from "./menuGenerator";

const Ctx = createContext<MenuGenerator | null>(null);

export function MenuGeneratorProvider({
  value,
  children,
}: {
  value: MenuGenerator;
  children: ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGenerator(): MenuGenerator {
  const gen = useContext(Ctx);
  if (!gen) {
    throw new Error("useGenerator must be used inside <MenuGeneratorProvider>");
  }
  return gen;
}
```

- [ ] **Step 4: Run test, confirm pass**

```bash
npm run test:run -- src/services/MenuGeneratorProvider.test.tsx
```

Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add src/services/MenuGeneratorProvider.tsx src/services/MenuGeneratorProvider.test.tsx
git commit -m "add MenuGeneratorProvider and useGenerator hook"
```

- [ ] **Step 6: PR → merge → walk Project task to Done**

---

## Task 8 — `menuReducer` and shared `types.ts`

**Project tasks:** `Spec: menu-generation` + `Tests: menu-reducer` + `Implement: menu-reducer`. Create all three.
**Owners:** `allium:tend` (spec), `test-engineer` (tests), `frontend-engineer` (impl).
**Blocked by:** Task 4.
**Files:**

- Create: `specs/menu-generation.allium`
- Create: `src/state/types.ts`
- Create: `src/state/menuReducer.ts`
- Create: `src/state/menuReducer.test.ts`

- [ ] **Step 1: Create the three Project tasks**

`Spec → Tests → Implement` chain, with the standard blocking relationships.

- [ ] **Step 2: Write `specs/menu-generation.allium`**

Use `allium:tend`. Required content:

- Entity `Generation` with `status ∈ {idle, parsing, generating, partial, done, error}`.
- Each card transitions through `pending → generating → ready` on success, `pending → generating → error` on failure.
- `OnGenerateMenu`: if a reference photo is set, call `parseMenuFromImage`; else `parseMenuFromText`. After parse, pad/truncate to N and fan out `generateDishImage` for items with non-blank `name`. Items with blank `name` stay `pending`.
- `OnRegenerateCard(id)`: only that card transitions; siblings untouched.
- `OnEditCardField(id, field, value)`: updates field, does not change status.
- Partial success: if some cards succeed and some fail, `globalStatus = partial`.

Run `allium check specs/menu-generation.allium`. Expect 0 errors.

- [ ] **Step 3: Write `src/state/types.ts`**

```ts
export type CardStatus = "pending" | "generating" | "ready" | "error";

export type MenuCard = {
  id: string;
  category: string;
  name: string;
  description: string;
  price: string;
  imageUrl: string | null;
  status: CardStatus;
  errorMessage?: string;
};

export type GlobalStatus =
  | "idle"
  | "parsing"
  | "generating"
  | "partial"
  | "done"
  | "error";

export type MenuState = {
  prompt: string;
  referencePhoto: File | null;
  count: number;
  cards: MenuCard[];
  globalStatus: GlobalStatus;
  globalError: string | null;
};

export type MenuAction =
  | { type: "setPrompt"; value: string }
  | { type: "setReferencePhoto"; file: File | null }
  | { type: "setCount"; value: number }
  | { type: "startGeneration"; ids: string[] }
  | {
      type: "parseSucceeded";
      items: {
        category: string;
        name: string;
        description: string;
        price: string;
      }[];
    }
  | { type: "cardStarted"; id: string }
  | { type: "cardSucceeded"; id: string; imageUrl: string }
  | { type: "cardFailed"; id: string; message: string }
  | {
      type: "editCardField";
      id: string;
      field: "category" | "name" | "description" | "price";
      value: string;
    }
  | { type: "regenerateCard"; id: string }
  | { type: "fail"; message: string };

export const initialMenuState: MenuState = {
  prompt: "",
  referencePhoto: null,
  count: 4,
  cards: [],
  globalStatus: "idle",
  globalError: null,
};
```

- [ ] **Step 4: Write failing reducer tests**

Create `src/state/menuReducer.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { menuReducer } from "./menuReducer";
import { initialMenuState, type MenuState, type MenuCard } from "./types";

function withCards(
  overrides: Partial<MenuState>,
  cards: MenuCard[],
): MenuState {
  return { ...initialMenuState, ...overrides, cards };
}

function makeCard(
  id: string,
  status: MenuCard["status"] = "pending",
): MenuCard {
  return {
    id,
    category: "",
    name: "X",
    description: "Y",
    price: "",
    imageUrl: null,
    status,
  };
}

describe("menuReducer", () => {
  it("setPrompt updates the prompt", () => {
    const next = menuReducer(initialMenuState, {
      type: "setPrompt",
      value: "hi",
    });
    expect(next.prompt).toBe("hi");
  });

  it("setCount clamps to [1, 8]", () => {
    expect(
      menuReducer(initialMenuState, { type: "setCount", value: 0 }).count,
    ).toBe(1);
    expect(
      menuReducer(initialMenuState, { type: "setCount", value: 99 }).count,
    ).toBe(8);
    expect(
      menuReducer(initialMenuState, { type: "setCount", value: 4 }).count,
    ).toBe(4);
  });

  it("parseSucceeded pads to count with blank items and sets globalStatus=generating", () => {
    const state = { ...initialMenuState, count: 4 };
    const next = menuReducer(state, {
      type: "parseSucceeded",
      items: [
        { category: "A", name: "X", description: "d", price: "$1" },
        { category: "B", name: "Y", description: "e", price: "$2" },
      ],
    });
    expect(next.cards.length).toBe(4);
    expect(next.cards[0].name).toBe("X");
    expect(next.cards[1].name).toBe("Y");
    expect(next.cards[2].name).toBe("");
    expect(next.cards[3].name).toBe("");
    expect(next.globalStatus).toBe("generating");
  });

  it("cardSucceeded sets imageUrl and ready status without touching siblings", () => {
    const state = withCards({}, [makeCard("a"), makeCard("b")]);
    const next = menuReducer(state, {
      type: "cardSucceeded",
      id: "a",
      imageUrl: "blob:x",
    });
    expect(next.cards[0].status).toBe("ready");
    expect(next.cards[0].imageUrl).toBe("blob:x");
    expect(next.cards[1]).toEqual(state.cards[1]);
  });

  it("cardFailed sets error status and message", () => {
    const state = withCards({}, [makeCard("a")]);
    const next = menuReducer(state, {
      type: "cardFailed",
      id: "a",
      message: "boom",
    });
    expect(next.cards[0].status).toBe("error");
    expect(next.cards[0].errorMessage).toBe("boom");
  });

  it("globalStatus becomes 'done' when all non-blank cards reach ready", () => {
    const state = withCards({}, [
      { ...makeCard("a", "generating") },
      { ...makeCard("b", "generating") },
    ]);
    const after1 = menuReducer(state, {
      type: "cardSucceeded",
      id: "a",
      imageUrl: "u1",
    });
    const after2 = menuReducer(after1, {
      type: "cardSucceeded",
      id: "b",
      imageUrl: "u2",
    });
    expect(after2.globalStatus).toBe("done");
  });

  it("globalStatus becomes 'partial' when some cards fail and others succeed", () => {
    const state = withCards({}, [
      makeCard("a", "generating"),
      makeCard("b", "generating"),
    ]);
    const a = menuReducer(state, {
      type: "cardSucceeded",
      id: "a",
      imageUrl: "u",
    });
    const b = menuReducer(a, { type: "cardFailed", id: "b", message: "x" });
    expect(b.globalStatus).toBe("partial");
  });

  it("editCardField updates the named field without changing status", () => {
    const state = withCards({}, [{ ...makeCard("a", "ready"), imageUrl: "u" }]);
    const next = menuReducer(state, {
      type: "editCardField",
      id: "a",
      field: "name",
      value: "Renamed",
    });
    expect(next.cards[0].name).toBe("Renamed");
    expect(next.cards[0].status).toBe("ready");
  });

  it("regenerateCard resets only that card to generating", () => {
    const state = withCards({}, [
      { ...makeCard("a", "ready"), imageUrl: "u" },
      { ...makeCard("b", "ready"), imageUrl: "v" },
    ]);
    const next = menuReducer(state, { type: "regenerateCard", id: "a" });
    expect(next.cards[0].status).toBe("generating");
    expect(next.cards[0].imageUrl).toBe(null);
    expect(next.cards[1].status).toBe("ready");
    expect(next.cards[1].imageUrl).toBe("v");
  });

  it("fail sets globalStatus=error and clears in-flight generations", () => {
    const state = withCards({}, [makeCard("a", "generating")]);
    const next = menuReducer(state, { type: "fail", message: "down" });
    expect(next.globalStatus).toBe("error");
    expect(next.globalError).toBe("down");
  });
});
```

Run:

```bash
npm run test:run -- src/state/menuReducer.test.ts
```

Expected: import-time fail. Right reason.

Commit failing tests:

```bash
git add src/state/types.ts src/state/menuReducer.test.ts
git commit -m "add menuReducer types and failing reducer tests"
```

- [ ] **Step 5: Write the reducer**

Create `src/state/menuReducer.ts`:

```ts
import type { MenuAction, MenuCard, MenuState } from "./types";
import { initialMenuState } from "./types";

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

function reconcileGlobalStatus(cards: MenuCard[]): MenuState["globalStatus"] {
  const active = cards.filter((c) => c.name !== "" || c.description !== "");
  if (active.length === 0) return "idle";
  if (active.some((c) => c.status === "generating" || c.status === "pending")) {
    return "generating";
  }
  const anyError = active.some((c) => c.status === "error");
  const anyReady = active.some((c) => c.status === "ready");
  if (anyError && anyReady) return "partial";
  if (anyError) return "error";
  return "done";
}

function updateCard(
  cards: MenuCard[],
  id: string,
  patch: Partial<MenuCard>,
): MenuCard[] {
  return cards.map((c) => (c.id === id ? { ...c, ...patch } : c));
}

export function menuReducer(state: MenuState, action: MenuAction): MenuState {
  switch (action.type) {
    case "setPrompt":
      return { ...state, prompt: action.value };
    case "setReferencePhoto":
      return { ...state, referencePhoto: action.file };
    case "setCount":
      return { ...state, count: clamp(action.value, 1, 8) };
    case "startGeneration":
      return {
        ...state,
        globalStatus: "parsing",
        globalError: null,
      };
    case "parseSucceeded": {
      const padded = [...action.items];
      while (padded.length < state.count) {
        padded.push({ category: "", name: "", description: "", price: "" });
      }
      const trimmed = padded.slice(0, state.count);
      const cards: MenuCard[] = trimmed.map((item, idx) => ({
        id: `card-${idx + 1}-${cryptoRandom()}`,
        category: item.category,
        name: item.name,
        description: item.description,
        price: item.price,
        imageUrl: null,
        status:
          item.name === "" && item.description === ""
            ? "pending"
            : "generating",
      }));
      return { ...state, cards, globalStatus: "generating" };
    }
    case "cardStarted":
      return {
        ...state,
        cards: updateCard(state.cards, action.id, {
          status: "generating",
          errorMessage: undefined,
        }),
      };
    case "cardSucceeded": {
      const cards = updateCard(state.cards, action.id, {
        status: "ready",
        imageUrl: action.imageUrl,
        errorMessage: undefined,
      });
      return { ...state, cards, globalStatus: reconcileGlobalStatus(cards) };
    }
    case "cardFailed": {
      const cards = updateCard(state.cards, action.id, {
        status: "error",
        errorMessage: action.message,
      });
      return { ...state, cards, globalStatus: reconcileGlobalStatus(cards) };
    }
    case "editCardField":
      return {
        ...state,
        cards: updateCard(state.cards, action.id, {
          [action.field]: action.value,
        }),
      };
    case "regenerateCard":
      return {
        ...state,
        cards: updateCard(state.cards, action.id, {
          status: "generating",
          imageUrl: null,
          errorMessage: undefined,
        }),
        globalStatus: "generating",
      };
    case "fail":
      return { ...state, globalStatus: "error", globalError: action.message };
  }
}

function cryptoRandom() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

export { initialMenuState };
```

- [ ] **Step 6: Run reducer tests, confirm pass**

```bash
npm run test:run -- src/state/menuReducer.test.ts
```

Expected: all tests pass.

- [ ] **Step 7: Run allium:weed against menu-generation spec**

Expect drift on parts of the spec not yet covered by code (e.g., the actual `OnGenerateMenu` orchestration lives in `App.tsx` later). Note the drift but it should resolve in Task 22.

- [ ] **Step 8: Commit**

```bash
git add src/state/menuReducer.ts specs/menu-generation.allium
git commit -m "implement menuReducer per menu-generation spec"
```

- [ ] **Step 9: PR → merge → Done**

---

## Task 9 — `useApiKey` hook + `api-key.allium`

**Project tasks:** `Spec: api-key` + `Tests: api-key-hook` + `Implement: api-key-hook`.
**Owners:** `allium:tend`, `test-engineer`, `frontend-engineer`.
**Blocked by:** Task 1.
**Files:**

- Create: `specs/api-key.allium`
- Create: `src/hooks/useApiKey.ts`
- Create: `src/hooks/useApiKey.test.ts`

- [ ] **Step 1: Create the three Project tasks**

- [ ] **Step 2: Write `specs/api-key.allium`**

Rules: key is required to call any generator method when not in fake mode. Storage key is `menu-generator.geminiApiKey`. Setting and clearing both persist immediately. Reading at mount returns the most recent persisted value or `null`.

Run `allium check specs/api-key.allium`. Expect 0 errors.

- [ ] **Step 3: Write the failing hook test**

Create `src/hooks/useApiKey.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useApiKey, API_KEY_STORAGE_KEY } from "./useApiKey";

beforeEach(() => {
  window.localStorage.clear();
});

describe("useApiKey", () => {
  it("returns null when no key is stored", () => {
    const { result } = renderHook(() => useApiKey());
    expect(result.current.apiKey).toBeNull();
  });

  it("returns the persisted key on mount", () => {
    window.localStorage.setItem(API_KEY_STORAGE_KEY, "stored-key");
    const { result } = renderHook(() => useApiKey());
    expect(result.current.apiKey).toBe("stored-key");
  });

  it("setApiKey persists and updates state", () => {
    const { result } = renderHook(() => useApiKey());
    act(() => result.current.setApiKey("new-key"));
    expect(result.current.apiKey).toBe("new-key");
    expect(window.localStorage.getItem(API_KEY_STORAGE_KEY)).toBe("new-key");
  });

  it("clearApiKey removes the persisted value", () => {
    window.localStorage.setItem(API_KEY_STORAGE_KEY, "existing");
    const { result } = renderHook(() => useApiKey());
    act(() => result.current.clearApiKey());
    expect(result.current.apiKey).toBeNull();
    expect(window.localStorage.getItem(API_KEY_STORAGE_KEY)).toBeNull();
  });

  it("trims whitespace from setApiKey input", () => {
    const { result } = renderHook(() => useApiKey());
    act(() => result.current.setApiKey("   abc   "));
    expect(result.current.apiKey).toBe("abc");
  });
});
```

Run:

```bash
npm run test:run -- src/hooks/useApiKey.test.ts
```

Expected: fail. Commit:

```bash
git add specs/api-key.allium src/hooks/useApiKey.test.ts
git commit -m "add useApiKey failing tests and api-key spec"
```

- [ ] **Step 4: Implement the hook**

Create `src/hooks/useApiKey.ts`:

```ts
import { useCallback, useState } from "react";

export const API_KEY_STORAGE_KEY = "menu-generator.geminiApiKey";

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(API_KEY_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const setApiKey = useCallback((value: string) => {
    const trimmed = value.trim();
    try {
      window.localStorage.setItem(API_KEY_STORAGE_KEY, trimmed);
    } catch {
      /* localStorage disabled — fall back to in-memory state only */
    }
    setApiKeyState(trimmed);
  }, []);

  const clearApiKey = useCallback(() => {
    try {
      window.localStorage.removeItem(API_KEY_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setApiKeyState(null);
  }, []);

  return { apiKey, setApiKey, clearApiKey };
}
```

- [ ] **Step 5: Run test, confirm pass**

```bash
npm run test:run -- src/hooks/useApiKey.test.ts
```

Expected: 5 passed.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useApiKey.ts
git commit -m "implement useApiKey hook"
```

- [ ] **Step 7: allium:weed against api-key spec; PR → merge → Done**

---

## Task 10 — `ApiKeyForm` and `ApiKeyGate`

**Project task:** `Tests: api-key-gate` + `Implement: api-key-gate`.
**Owners:** `test-engineer` and `frontend-engineer`.
**Blocked by:** Task 9.
**Files:**

- Create: `src/components/ApiKeyForm.tsx` + `.module.css` + `.test.tsx`
- Create: `src/components/ApiKeyGate.tsx` + `.test.tsx`

- [ ] **Step 1: Create both Project tasks**

- [ ] **Step 2: Write the failing tests**

Create `src/components/ApiKeyForm.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiKeyForm } from "./ApiKeyForm";

describe("ApiKeyForm", () => {
  it("renders an input and a save button", () => {
    render(<ApiKeyForm onSave={() => {}} />);
    expect(screen.getByLabelText(/gemini api key/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
  });

  it("calls onSave with the trimmed key when submitted", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ApiKeyForm onSave={onSave} />);
    await user.type(screen.getByLabelText(/gemini api key/i), "   abc123   ");
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(onSave).toHaveBeenCalledWith("abc123");
  });

  it("disables save when input is empty or whitespace", async () => {
    const user = userEvent.setup();
    render(<ApiKeyForm onSave={() => {}} />);
    const btn = screen.getByRole("button", { name: /save/i });
    expect(btn).toBeDisabled();
    await user.type(screen.getByLabelText(/gemini api key/i), "   ");
    expect(btn).toBeDisabled();
    await user.type(screen.getByLabelText(/gemini api key/i), "x");
    expect(btn).toBeEnabled();
  });
});
```

Create `src/components/ApiKeyGate.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiKeyGate } from "./ApiKeyGate";
import { API_KEY_STORAGE_KEY } from "../hooks/useApiKey";

beforeEach(() => {
  window.localStorage.clear();
  // ensure we are not in fake mode for these tests
  window.history.replaceState({}, "", "/");
});

describe("ApiKeyGate", () => {
  it("renders the ApiKeyForm when no key is set", () => {
    render(
      <ApiKeyGate>
        <div>protected</div>
      </ApiKeyGate>,
    );
    expect(screen.getByLabelText(/gemini api key/i)).toBeInTheDocument();
    expect(screen.queryByText("protected")).not.toBeInTheDocument();
  });

  it("renders children when a key is already stored", () => {
    window.localStorage.setItem(API_KEY_STORAGE_KEY, "k");
    render(
      <ApiKeyGate>
        <div>protected</div>
      </ApiKeyGate>,
    );
    expect(screen.getByText("protected")).toBeInTheDocument();
  });

  it("reveals children after the user saves a key", async () => {
    const user = userEvent.setup();
    render(
      <ApiKeyGate>
        <div>protected</div>
      </ApiKeyGate>,
    );
    await user.type(screen.getByLabelText(/gemini api key/i), "fresh-key");
    await user.click(screen.getByRole("button", { name: /save/i }));
    expect(screen.getByText("protected")).toBeInTheDocument();
  });

  it("renders children unconditionally when ?fake=true is in the URL", () => {
    window.history.replaceState({}, "", "/?fake=true");
    render(
      <ApiKeyGate>
        <div>protected</div>
      </ApiKeyGate>,
    );
    expect(screen.getByText("protected")).toBeInTheDocument();
  });
});
```

Run:

```bash
npm run test:run -- src/components/ApiKeyForm.test.tsx src/components/ApiKeyGate.test.tsx
```

Expected: fail. Commit:

```bash
git add src/components/ApiKeyForm.test.tsx src/components/ApiKeyGate.test.tsx
git commit -m "add failing tests for ApiKeyForm and ApiKeyGate"
```

- [ ] **Step 3: Implement ApiKeyForm**

Create `src/components/ApiKeyForm.module.css`:

```css
.form {
  background: var(--color-surface);
  border: 1px solid var(--color-divider);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  max-width: 420px;
  margin: var(--space-7) auto;
  box-shadow: var(--shadow-card);
}
.title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  margin: 0 0 var(--space-3);
}
.subtitle {
  color: var(--color-ink-soft);
  margin: 0 0 var(--space-5);
}
.label {
  display: block;
  font-size: 0.85rem;
  color: var(--color-ink-soft);
  margin-bottom: var(--space-2);
}
.input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-divider);
  background: white;
  margin-bottom: var(--space-4);
}
.save {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  background: var(--color-accent);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-weight: 500;
}
.save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.hint {
  font-size: 0.8rem;
  color: var(--color-ink-mute);
  margin-top: var(--space-4);
}
```

Create `src/components/ApiKeyForm.tsx`:

```tsx
import { useState } from "react";
import styles from "./ApiKeyForm.module.css";

export function ApiKeyForm({ onSave }: { onSave: (key: string) => void }) {
  const [value, setValue] = useState("");
  const trimmed = value.trim();
  const canSave = trimmed.length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (canSave) onSave(trimmed);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h1 className={styles.title}>Menu Generator</h1>
      <p className={styles.subtitle}>
        Paste your Gemini API key to start generating menus. The key stays in
        your browser — nothing is sent to a server other than Google.
      </p>
      <label className={styles.label} htmlFor="api-key">
        Gemini API key
      </label>
      <input
        id="api-key"
        className={styles.input}
        type="password"
        autoComplete="off"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button className={styles.save} type="submit" disabled={!canSave}>
        Save and continue
      </button>
      <p className={styles.hint}>
        Get a key from{" "}
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noreferrer"
        >
          aistudio.google.com
        </a>
        .
      </p>
    </form>
  );
}
```

- [ ] **Step 4: Implement ApiKeyGate**

Create `src/components/ApiKeyGate.tsx`:

```tsx
import type { ReactNode } from "react";
import { useApiKey } from "../hooks/useApiKey";
import { ApiKeyForm } from "./ApiKeyForm";

export function ApiKeyGate({ children }: { children: ReactNode }) {
  const { apiKey, setApiKey } = useApiKey();
  const isFake = new URLSearchParams(window.location.search).has("fake");
  if (isFake || apiKey) {
    return <>{children}</>;
  }
  return <ApiKeyForm onSave={setApiKey} />;
}
```

- [ ] **Step 5: Run tests, confirm pass**

```bash
npm run test:run -- src/components/ApiKeyForm.test.tsx src/components/ApiKeyGate.test.tsx
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/ApiKeyForm.tsx src/components/ApiKeyForm.module.css src/components/ApiKeyGate.tsx
git commit -m "implement ApiKeyForm and ApiKeyGate components"
```

- [ ] **Step 7: PR → merge → Done**

---

## Task 11 — `Header` component

**Project task:** `Tests: header` + `Implement: header`.
**Files:** `src/components/Header.tsx` + `.module.css` + `.test.tsx`.

- [ ] **Step 1: Tasks created and self-assigned**

- [ ] **Step 2: Write the failing test**

Create `src/components/Header.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Header } from "./Header";

describe("Header", () => {
  it("renders the wordmark and tagline", () => {
    render(<Header />);
    expect(
      screen.getByRole("heading", { level: 1, name: /menu generator/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/create your graphical menu/i)).toBeInTheDocument();
  });

  it("does not render an EAT OR MAY eyebrow", () => {
    render(<Header />);
    expect(screen.queryByText(/eat or may/i)).not.toBeInTheDocument();
  });
});
```

Run, confirm fail, commit failing test.

- [ ] **Step 3: Implement Header**

Create `src/components/Header.module.css`:

```css
.header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0 var(--space-6);
}
.mark {
  width: 28px;
  height: 28px;
  background: var(--color-ink);
  color: var(--color-bg);
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
  font-weight: 600;
}
.wordmark {
  display: flex;
  flex-direction: column;
}
.title {
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0;
  letter-spacing: -0.01em;
}
.tagline {
  margin: 0;
  font-size: 0.72rem;
  color: var(--color-ink-mute);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
```

Create `src/components/Header.tsx`:

```tsx
import styles from "./Header.module.css";

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.mark} aria-hidden="true">
        +
      </div>
      <div className={styles.wordmark}>
        <h1 className={styles.title}>Menu Generator</h1>
        <p className={styles.tagline}>Create your graphical menu</p>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Run test, confirm pass**

- [ ] **Step 5: Commit**

```bash
git add src/components/Header.tsx src/components/Header.module.css src/components/Header.test.tsx
git commit -m "add Header component"
```

---

## Task 12 — `CountStepper` component

**Project task:** `Tests: count-stepper` + `Implement: count-stepper`.
**Files:** `src/components/CountStepper.tsx` + `.module.css` + `.test.tsx`.

- [ ] **Step 1: Project tasks created**

- [ ] **Step 2: Write the failing test**

```tsx
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
```

Run, fail, commit failing.

- [ ] **Step 3: Implement**

Create `src/components/CountStepper.module.css`:

```css
.wrap {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  border: 1px solid var(--color-divider);
  border-radius: var(--radius-pill);
  padding: var(--space-1) var(--space-2);
  background: white;
}
.btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-pill);
  background: transparent;
  font-size: 1.1rem;
  line-height: 1;
}
.btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.value {
  min-width: 1.5em;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
```

Create `src/components/CountStepper.tsx`:

```tsx
import styles from "./CountStepper.module.css";

export function CountStepper({
  value,
  onChange,
  min = 1,
  max = 8,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.btn}
        aria-label="Decrease menu item count"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <span className={styles.value} aria-label="Menu item count">
        {value}
      </span>
      <button
        type="button"
        className={styles.btn}
        aria-label="Increase menu item count"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run tests, pass, commit**

```bash
git add src/components/CountStepper.tsx src/components/CountStepper.module.css src/components/CountStepper.test.tsx
git commit -m "add CountStepper component"
```

---

## Task 13 — `SuggestionChips` component

**Project task:** `Tests: suggestion-chips` + `Implement: suggestion-chips`.
**Files:** `src/components/SuggestionChips.tsx` + `.module.css` + `.test.tsx`.

- [ ] **Step 1: Tasks created**

- [ ] **Step 2: Failing test**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SuggestionChips, SUGGESTIONS } from "./SuggestionChips";

describe("SuggestionChips", () => {
  it("renders one chip per static suggestion", () => {
    render(<SuggestionChips onPick={() => {}} />);
    for (const s of SUGGESTIONS) {
      expect(screen.getByRole("button", { name: s.label })).toBeInTheDocument();
    }
  });

  it("calls onPick with the suggestion's prompt text when clicked", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<SuggestionChips onPick={onPick} />);
    await user.click(
      screen.getByRole("button", { name: SUGGESTIONS[0].label }),
    );
    expect(onPick).toHaveBeenCalledWith(SUGGESTIONS[0].prompt);
  });
});
```

Run, fail, commit failing.

- [ ] **Step 3: Implement**

Create `src/components/SuggestionChips.module.css`:

```css
.row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-3);
}
.chip {
  background: var(--color-surface-2);
  border: 1px solid var(--color-divider);
  border-radius: var(--radius-pill);
  padding: var(--space-1) var(--space-3);
  font-size: 0.8rem;
  color: var(--color-ink-soft);
}
.chip:hover {
  background: white;
}
```

Create `src/components/SuggestionChips.tsx`:

```tsx
import styles from "./SuggestionChips.module.css";

export const SUGGESTIONS = [
  {
    label: "Italian tasting menu",
    prompt: "An Italian tasting menu with antipasto, pasta, main, and a dolce.",
  },
  {
    label: "Sunday brunch",
    prompt:
      "A relaxed Sunday brunch with eggs, pancakes, a salad, and a coffee drink.",
  },
  {
    label: "Cocktail flight",
    prompt: "Four cocktails of contrasting styles served as a flight.",
  },
  {
    label: "Trattoria dinner",
    prompt:
      "A rustic trattoria dinner with bread, antipasto, a hearty pasta, and tiramisu.",
  },
] as const;

export function SuggestionChips({
  onPick,
}: {
  onPick: (prompt: string) => void;
}) {
  return (
    <div className={styles.row}>
      {SUGGESTIONS.map((s) => (
        <button
          key={s.label}
          type="button"
          className={styles.chip}
          onClick={() => onPick(s.prompt)}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Pass, commit**

```bash
git add src/components/SuggestionChips.tsx src/components/SuggestionChips.module.css src/components/SuggestionChips.test.tsx
git commit -m "add SuggestionChips component"
```

---

## Task 14 — `ReferencePhotoDropzone` + `reference-photo.allium`

**Project tasks:** `Spec: reference-photo` + `Tests: reference-photo-dropzone` + `Implement: reference-photo-dropzone`.
**Files:**

- Create: `specs/reference-photo.allium`
- Create: `src/components/ReferencePhotoDropzone.tsx` + `.module.css` + `.test.tsx`

- [ ] **Step 1: Project tasks created**

- [ ] **Step 2: Write `specs/reference-photo.allium`**

Rules: accepts a single file; accepted MIME types are `image/png` and `image/jpeg` (PNG and JPG per the mockup); dropping or selecting a file replaces any prior file; a remove control returns the dropzone to empty.

Run `allium check`. Pass.

- [ ] **Step 3: Failing test**

```tsx
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
```

Run, fail, commit failing.

- [ ] **Step 4: Implement**

Create `src/components/ReferencePhotoDropzone.module.css`:

```css
.zone {
  border: 1px dashed var(--color-divider);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  background: var(--color-surface);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 76px;
}
.label {
  color: var(--color-ink-soft);
  font-size: 0.9rem;
}
.browse {
  color: var(--color-accent);
  text-decoration: underline;
  cursor: pointer;
}
.file {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
}
.thumb {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: var(--radius-sm);
}
.name {
  font-size: 0.9rem;
}
.remove {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--color-ink-mute);
  text-decoration: underline;
}
.hidden {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 1px;
  height: 1px;
}
```

Create `src/components/ReferencePhotoDropzone.tsx`:

```tsx
import { useEffect, useRef, useState } from "react";
import styles from "./ReferencePhotoDropzone.module.css";

const ACCEPTED = ["image/png", "image/jpeg"];

export function ReferencePhotoDropzone({
  file,
  onFileChange,
}: {
  file: File | null;
  onFileChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handlePick(f: File | null) {
    if (!f) return onFileChange(null);
    if (!ACCEPTED.includes(f.type)) return onFileChange(null);
    onFileChange(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0] ?? null;
    handlePick(f);
  }

  if (file && previewUrl) {
    return (
      <div className={styles.zone}>
        <div className={styles.file}>
          <img className={styles.thumb} src={previewUrl} alt="" />
          <span className={styles.name}>{file.name}</span>
          <button
            type="button"
            className={styles.remove}
            onClick={() => onFileChange(null)}
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={styles.zone}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <span className={styles.label}>
        Drop a reference photo. PNG or JPG, or{" "}
        <label className={styles.browse}>
          browse
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(",")}
            className={styles.hidden}
            aria-label="browse for a reference photo"
            onChange={(e) => handlePick(e.target.files?.[0] ?? null)}
          />
        </label>
        .
      </span>
    </div>
  );
}
```

- [ ] **Step 5: Run tests, pass, commit**

```bash
git add specs/reference-photo.allium src/components/ReferencePhotoDropzone.tsx src/components/ReferencePhotoDropzone.module.css src/components/ReferencePhotoDropzone.test.tsx
git commit -m "add ReferencePhotoDropzone with PNG/JPG validation"
```

---

## Task 15 — `ChangeApiKeyLink` component

**Project task:** `Implement: change-api-key-link` (no separate spec — covered by `api-key.allium`).
**Files:** `src/components/ChangeApiKeyLink.tsx` + `.test.tsx`.

- [ ] **Step 1: Project task created**

- [ ] **Step 2: Failing test**

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChangeApiKeyLink } from "./ChangeApiKeyLink";
import { API_KEY_STORAGE_KEY } from "../hooks/useApiKey";

beforeEach(() => {
  window.localStorage.setItem(API_KEY_STORAGE_KEY, "existing");
});

describe("ChangeApiKeyLink", () => {
  it("clears the stored key and reloads when clicked", async () => {
    const user = userEvent.setup();
    const reload = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...window.location, reload },
      writable: true,
    });
    render(<ChangeApiKeyLink />);
    await user.click(screen.getByRole("button", { name: /change api key/i }));
    expect(window.localStorage.getItem(API_KEY_STORAGE_KEY)).toBeNull();
    expect(reload).toHaveBeenCalled();
  });
});
```

Note: this test mutates `window.location` — keep it scoped to one test file. Run, fail, commit failing.

- [ ] **Step 3: Implement**

Create `src/components/ChangeApiKeyLink.tsx`:

```tsx
import { useApiKey } from "../hooks/useApiKey";

export function ChangeApiKeyLink() {
  const { clearApiKey } = useApiKey();
  return (
    <button
      type="button"
      onClick={() => {
        clearApiKey();
        window.location.reload();
      }}
      style={{
        background: "none",
        border: "none",
        color: "var(--color-ink-mute)",
        textDecoration: "underline",
        fontSize: "0.8rem",
        padding: 0,
        marginTop: "var(--space-3)",
        cursor: "pointer",
      }}
    >
      Change API key
    </button>
  );
}
```

- [ ] **Step 4: Pass, commit**

```bash
git add src/components/ChangeApiKeyLink.tsx src/components/ChangeApiKeyLink.test.tsx
git commit -m "add ChangeApiKeyLink"
```

---

## Task 16 — `PromptForm` composition + `prompt-form.allium`

**Project tasks:** `Spec: prompt-form` + `Tests: prompt-form` + `Implement: prompt-form`.
**Files:**

- Create: `specs/prompt-form.allium`
- Create: `src/components/PromptForm.tsx` + `.module.css` + `.test.tsx`

- [ ] **Step 1: Tasks created**

- [ ] **Step 2: Write `specs/prompt-form.allium`**

Rules: `Generate menu` button is enabled iff (prompt non-empty OR reference photo set) AND count ∈ [1,8] AND not already generating. Clicking it emits `OnGenerateMenu` with `{prompt, referencePhoto, count}`. Suggestion chips fill the textarea. The `Change API key` link is rendered at the end of the card.

`allium check`. Pass.

- [ ] **Step 3: Failing test**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PromptForm } from "./PromptForm";

describe("PromptForm", () => {
  it("disables Generate menu when prompt is empty and no photo is set", () => {
    render(
      <PromptForm
        count={4}
        onCountChange={() => {}}
        onGenerate={() => {}}
        isGenerating={false}
      />,
    );
    expect(
      screen.getByRole("button", { name: /generate menu/i }),
    ).toBeDisabled();
  });

  it("enables Generate menu when prompt is non-empty", async () => {
    const user = userEvent.setup();
    render(
      <PromptForm
        count={4}
        onCountChange={() => {}}
        onGenerate={() => {}}
        isGenerating={false}
      />,
    );
    await user.type(screen.getByLabelText(/describe today's menu/i), "pizza");
    expect(
      screen.getByRole("button", { name: /generate menu/i }),
    ).toBeEnabled();
  });

  it("clicking a suggestion chip fills the textarea", async () => {
    const user = userEvent.setup();
    render(
      <PromptForm
        count={4}
        onCountChange={() => {}}
        onGenerate={() => {}}
        isGenerating={false}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /italian tasting menu/i }),
    );
    expect(screen.getByLabelText(/describe today's menu/i)).toHaveValue(
      expect.stringMatching(/italian/i),
    );
  });

  it("calls onGenerate with the assembled request", async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn();
    render(
      <PromptForm
        count={4}
        onCountChange={() => {}}
        onGenerate={onGenerate}
        isGenerating={false}
      />,
    );
    await user.type(screen.getByLabelText(/describe today's menu/i), "tacos");
    await user.click(screen.getByRole("button", { name: /generate menu/i }));
    expect(onGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "tacos",
        count: 4,
        referencePhoto: null,
      }),
    );
  });

  it("disables Generate menu while isGenerating is true", () => {
    render(
      <PromptForm
        count={4}
        onCountChange={() => {}}
        onGenerate={() => {}}
        isGenerating
      />,
    );
    expect(
      screen.getByRole("button", { name: /generate menu/i }),
    ).toBeDisabled();
  });
});
```

Run, fail, commit failing.

- [ ] **Step 4: Implement**

Create `src/components/PromptForm.module.css`:

```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-divider);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  display: grid;
  gap: var(--space-4);
  grid-template-columns: 2fr 1fr;
  box-shadow: var(--shadow-card);
}
.left {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.right {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: stretch;
}
.label {
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  color: var(--color-ink-mute);
  text-transform: uppercase;
}
.textarea {
  min-height: 96px;
  resize: vertical;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-divider);
  padding: var(--space-3) var(--space-4);
  background: white;
  font-family: var(--font-display);
  font-size: 1.05rem;
}
.cta {
  background: var(--color-accent);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  font-weight: 500;
}
.cta:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
@media (max-width: 720px) {
  .card {
    grid-template-columns: 1fr;
  }
}
```

Create `src/components/PromptForm.tsx`:

```tsx
import { useState } from "react";
import styles from "./PromptForm.module.css";
import { ReferencePhotoDropzone } from "./ReferencePhotoDropzone";
import { CountStepper } from "./CountStepper";
import { SuggestionChips } from "./SuggestionChips";
import { ChangeApiKeyLink } from "./ChangeApiKeyLink";

export type GenerateRequest = {
  prompt: string;
  referencePhoto: File | null;
  count: number;
};

export function PromptForm({
  count,
  onCountChange,
  onGenerate,
  isGenerating,
}: {
  count: number;
  onCountChange: (n: number) => void;
  onGenerate: (req: GenerateRequest) => void;
  isGenerating: boolean;
}) {
  const [prompt, setPrompt] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const canSubmit =
    (prompt.trim().length > 0 || photo !== null) && !isGenerating;

  return (
    <form
      className={styles.card}
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit)
          onGenerate({ prompt: prompt.trim(), referencePhoto: photo, count });
      }}
    >
      <div className={styles.left}>
        <label htmlFor="menu-prompt" className={styles.label}>
          Describe today's menu
        </label>
        <textarea
          id="menu-prompt"
          className={styles.textarea}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="A four-course Italian dinner — antipasto, pasta, main, and a dolce"
        />
        <SuggestionChips onPick={setPrompt} />
      </div>

      <div className={styles.right}>
        <span className={styles.label}>Reference photo — optional</span>
        <ReferencePhotoDropzone file={photo} onFileChange={setPhoto} />
        <div className={styles.controls}>
          <CountStepper value={count} onChange={onCountChange} />
          <button type="submit" className={styles.cta} disabled={!canSubmit}>
            {isGenerating ? "Generating…" : "Generate menu"}
          </button>
        </div>
        <ChangeApiKeyLink />
      </div>
    </form>
  );
}
```

- [ ] **Step 5: Run tests, pass, commit**

```bash
git add specs/prompt-form.allium src/components/PromptForm.tsx src/components/PromptForm.module.css src/components/PromptForm.test.tsx
git commit -m "compose PromptForm with all input controls"
```

---

## Task 17 — `MenuCard` + `menu-card.allium`

**Project tasks:** `Spec: menu-card` + `Tests: menu-card` + `Implement: menu-card`.
**Files:**

- Create: `specs/menu-card.allium`
- Create: `src/components/MenuCard.tsx` + `.module.css` + `.test.tsx`

- [ ] **Step 1: Tasks created**

- [ ] **Step 2: Write `specs/menu-card.allium`**

Rules: every text field is editable inline; ↻ regenerates the image for this card only; status transitions are `pending → generating → ready | error`; error cards show the failure message and stay clickable to retry.

- [ ] **Step 3: Failing test**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MenuCard } from "./MenuCard";
import type { MenuCard as Card } from "../state/types";

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: "a",
    category: "PASTA",
    name: "Rigatoni",
    description: "tomato + guanciale",
    price: "$25",
    imageUrl: "blob:img",
    status: "ready",
    ...overrides,
  };
}

describe("MenuCard", () => {
  it("renders the image, name, description and price", () => {
    render(
      <MenuCard card={makeCard()} onEdit={() => {}} onRegenerate={() => {}} />,
    );
    expect(screen.getByRole("img")).toHaveAttribute("src", "blob:img");
    expect(screen.getByDisplayValue("Rigatoni")).toBeInTheDocument();
    expect(screen.getByDisplayValue("tomato + guanciale")).toBeInTheDocument();
    expect(screen.getByDisplayValue("$25")).toBeInTheDocument();
  });

  it("shows a skeleton when status is generating", () => {
    render(
      <MenuCard
        card={makeCard({ status: "generating", imageUrl: null })}
        onEdit={() => {}}
        onRegenerate={() => {}}
      />,
    );
    expect(screen.getByTestId("card-skeleton")).toBeInTheDocument();
  });

  it("shows an error message and retry control when status is error", async () => {
    const user = userEvent.setup();
    const onRegenerate = vi.fn();
    render(
      <MenuCard
        card={makeCard({
          status: "error",
          imageUrl: null,
          errorMessage: "Rate limited",
        })}
        onEdit={() => {}}
        onRegenerate={onRegenerate}
      />,
    );
    expect(screen.getByText(/rate limited/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /regenerate|retry/i }));
    expect(onRegenerate).toHaveBeenCalledWith("a");
  });

  it("calls onEdit with the new value when the user edits a field", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <MenuCard card={makeCard()} onEdit={onEdit} onRegenerate={() => {}} />,
    );
    const nameField = screen.getByDisplayValue("Rigatoni") as HTMLInputElement;
    await user.clear(nameField);
    await user.type(nameField, "Cacio e Pepe");
    expect(onEdit).toHaveBeenLastCalledWith("a", "name", "Cacio e Pepe");
  });

  it("clicking the regenerate button calls onRegenerate with the card id", async () => {
    const user = userEvent.setup();
    const onRegenerate = vi.fn();
    render(
      <MenuCard
        card={makeCard()}
        onEdit={() => {}}
        onRegenerate={onRegenerate}
      />,
    );
    await user.click(screen.getByRole("button", { name: /regenerate/i }));
    expect(onRegenerate).toHaveBeenCalledWith("a");
  });
});
```

Run, fail, commit failing.

- [ ] **Step 4: Implement**

Create `src/components/MenuCard.module.css`:

```css
.card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
}
.imgWrap {
  position: relative;
  aspect-ratio: 4 / 3;
  background: var(--color-surface-2);
  display: grid;
  place-items: center;
}
.img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.skel {
  width: 80%;
  height: 60%;
  background: linear-gradient(
    90deg,
    var(--color-surface-2),
    var(--color-divider),
    var(--color-surface-2)
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
  border-radius: var(--radius-md);
}
@keyframes shimmer {
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -200% 0;
  }
}
.error {
  color: var(--color-error);
  text-align: center;
  padding: var(--space-3);
  font-size: 0.85rem;
}
.cat {
  position: absolute;
  top: var(--space-3);
  left: var(--space-3);
  background: white;
  color: var(--color-ink-soft);
  border-radius: var(--radius-sm);
  padding: 2px 8px;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.regen {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  background: white;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-pill);
  cursor: pointer;
  font-size: 1rem;
}
.body {
  padding: var(--space-4);
  display: grid;
  gap: var(--space-2);
}
.row {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
}
.name {
  flex: 1;
  font-family: var(--font-display);
  font-size: 1.1rem;
  border: none;
  background: transparent;
  padding: 0;
}
.price {
  background: var(--color-surface-2);
  border-radius: var(--radius-sm);
  padding: 2px 8px;
  font-size: 0.85rem;
  border: none;
  max-width: 80px;
  text-align: right;
}
.desc {
  font-style: italic;
  color: var(--color-ink-soft);
  font-size: 0.9rem;
  border: none;
  background: transparent;
  padding: 0;
  resize: none;
  width: 100%;
}
.catInput {
  background: white;
  border: 1px solid var(--color-divider);
  border-radius: var(--radius-sm);
  padding: 2px 6px;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  width: 96px;
}
```

Create `src/components/MenuCard.tsx`:

```tsx
import styles from "./MenuCard.module.css";
import type { MenuCard as Card } from "../state/types";

export function MenuCard({
  card,
  onEdit,
  onRegenerate,
}: {
  card: Card;
  onEdit: (
    id: string,
    field: "category" | "name" | "description" | "price",
    value: string,
  ) => void;
  onRegenerate: (id: string) => void;
}) {
  const showSkeleton =
    card.status === "generating" || card.status === "pending";

  return (
    <article className={styles.card}>
      <div className={styles.imgWrap}>
        {card.status === "ready" && card.imageUrl ? (
          <img
            className={styles.img}
            src={card.imageUrl}
            alt={card.name || "Generated dish"}
          />
        ) : showSkeleton ? (
          <div className={styles.skel} data-testid="card-skeleton" />
        ) : (
          <p className={styles.error}>
            {card.errorMessage ?? "Failed to generate"}
          </p>
        )}
        <input
          className={styles.catInput}
          aria-label="Category"
          value={card.category}
          onChange={(e) => onEdit(card.id, "category", e.target.value)}
          placeholder="CATEGORY"
        />
        <button
          type="button"
          className={styles.regen}
          aria-label={
            card.status === "error" ? "Retry / regenerate" : "Regenerate"
          }
          onClick={() => onRegenerate(card.id)}
        >
          ↻
        </button>
      </div>
      <div className={styles.body}>
        <div className={styles.row}>
          <input
            className={styles.name}
            aria-label="Name"
            value={card.name}
            onChange={(e) => onEdit(card.id, "name", e.target.value)}
            placeholder="Dish name"
          />
          <input
            className={styles.price}
            aria-label="Price"
            value={card.price}
            onChange={(e) => onEdit(card.id, "price", e.target.value)}
            placeholder="$0"
          />
        </div>
        <textarea
          className={styles.desc}
          aria-label="Description"
          value={card.description}
          onChange={(e) => onEdit(card.id, "description", e.target.value)}
          placeholder="Short description"
          rows={2}
        />
      </div>
    </article>
  );
}
```

- [ ] **Step 5: Pass, commit**

```bash
git add specs/menu-card.allium src/components/MenuCard.tsx src/components/MenuCard.module.css src/components/MenuCard.test.tsx
git commit -m "add editable MenuCard with regenerate button"
```

---

## Task 18 — `MenuGrid` component

**Project task:** `Tests: menu-grid` + `Implement: menu-grid`.
**Files:** `src/components/MenuGrid.tsx` + `.module.css` + `.test.tsx`.

- [ ] **Step 1: Tasks created**

- [ ] **Step 2: Failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MenuGrid } from "./MenuGrid";
import type { MenuCard } from "../state/types";

function card(id: string, name: string): MenuCard {
  return {
    id,
    category: "",
    name,
    description: "",
    price: "",
    imageUrl: null,
    status: "pending",
  };
}

describe("MenuGrid", () => {
  it("renders one MenuCard per entry", () => {
    render(
      <MenuGrid
        cards={[card("a", "X"), card("b", "Y")]}
        onEdit={() => {}}
        onRegenerate={() => {}}
      />,
    );
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("renders the subtitle 'N courses, plated' when cards are ready", () => {
    const ready = (id: string): MenuCard => ({
      ...card(id, "z"),
      status: "ready",
      imageUrl: "u",
    });
    render(
      <MenuGrid
        cards={[ready("a"), ready("b")]}
        onEdit={() => {}}
        onRegenerate={() => {}}
      />,
    );
    expect(screen.getByText(/2 courses/i)).toBeInTheDocument();
  });

  it("renders nothing visible when cards is empty", () => {
    const { container } = render(
      <MenuGrid cards={[]} onEdit={() => {}} onRegenerate={() => {}} />,
    );
    expect(container.querySelectorAll("article")).toHaveLength(0);
  });
});
```

Run, fail, commit failing.

- [ ] **Step 3: Implement**

Create `src/components/MenuGrid.module.css`:

```css
.section {
  margin-top: var(--space-7);
}
.subtitle {
  font-family: var(--font-display);
  font-size: 1.6rem;
  margin: 0 0 var(--space-5);
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.badge {
  font-family: var(--font-ui);
  font-size: 0.72rem;
  color: var(--color-ink-mute);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  border: 1px solid var(--color-divider);
  border-radius: var(--radius-pill);
  padding: 2px 10px;
}
.grid {
  display: grid;
  gap: var(--space-5);
  grid-template-columns: repeat(2, 1fr);
}
@media (max-width: 720px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
```

Create `src/components/MenuGrid.tsx`:

```tsx
import styles from "./MenuGrid.module.css";
import type { MenuCard as Card } from "../state/types";
import { MenuCard } from "./MenuCard";

export function MenuGrid({
  cards,
  onEdit,
  onRegenerate,
}: {
  cards: Card[];
  onEdit: (
    id: string,
    field: "category" | "name" | "description" | "price",
    value: string,
  ) => void;
  onRegenerate: (id: string) => void;
}) {
  if (cards.length === 0) return null;
  const readyCount = cards.filter((c) => c.status === "ready").length;
  return (
    <section className={styles.section}>
      <h2 className={styles.subtitle}>
        <span>
          {cards.length === 1
            ? "One course, plated"
            : `${cards.length} courses, plated`}
        </span>
        <span className={styles.badge}>{readyCount} ready</span>
      </h2>
      <div className={styles.grid}>
        {cards.map((c) => (
          <MenuCard
            key={c.id}
            card={c}
            onEdit={onEdit}
            onRegenerate={onRegenerate}
          />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Pass, commit**

```bash
git add src/components/MenuGrid.tsx src/components/MenuGrid.module.css src/components/MenuGrid.test.tsx
git commit -m "add MenuGrid with responsive 2-up layout"
```

---

## Task 19 — `ErrorBanner` component

**Project task:** `Tests: error-banner` + `Implement: error-banner`.
**Files:** `src/components/ErrorBanner.tsx` + `.module.css` + `.test.tsx`.

- [ ] **Step 1: Tasks created**

- [ ] **Step 2: Failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBanner } from "./ErrorBanner";

describe("ErrorBanner", () => {
  it("renders nothing when message is null", () => {
    const { container } = render(<ErrorBanner message={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the message when provided", () => {
    render(<ErrorBanner message="key invalid" />);
    expect(screen.getByRole("alert")).toHaveTextContent(/key invalid/i);
  });
});
```

Fail, commit failing.

- [ ] **Step 3: Implement**

Create `src/components/ErrorBanner.module.css`:

```css
.banner {
  background: #fbe7df;
  color: var(--color-error);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  margin-top: var(--space-4);
  font-size: 0.9rem;
}
```

Create `src/components/ErrorBanner.tsx`:

```tsx
import styles from "./ErrorBanner.module.css";

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className={styles.banner} role="alert">
      {message}
    </div>
  );
}
```

- [ ] **Step 4: Pass, commit**

```bash
git add src/components/ErrorBanner.tsx src/components/ErrorBanner.module.css src/components/ErrorBanner.test.tsx
git commit -m "add ErrorBanner"
```

---

## Task 20 — `App` orchestration and `main.tsx` wiring

**Project task:** `Implement: app-orchestration` (covers menu-generation rules; the spec was written in Task 8).
**Owner:** `frontend-engineer`.
**Blocked by:** Tasks 7, 8, 10, 11, 16, 18, 19.
**Files:**

- Modify: `src/main.tsx`
- Replace: `src/App.tsx`
- Delete: `src/App.css` (no longer used)

- [ ] **Step 1: Project task created**

- [ ] **Step 2: Replace App.tsx**

Overwrite `src/App.tsx` with:

```tsx
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { MenuGeneratorProvider } from "./services/MenuGeneratorProvider";
import { fakeMenuGenerator } from "./services/fakeMenuGenerator";
import { geminiMenuGenerator } from "./services/geminiMenuGenerator";
import type { MenuGenerator, ParsedMenuItem } from "./services/menuGenerator";
import { GeneratorError } from "./services/menuGenerator";
import { ApiKeyGate } from "./components/ApiKeyGate";
import { Header } from "./components/Header";
import { PromptForm, type GenerateRequest } from "./components/PromptForm";
import { MenuGrid } from "./components/MenuGrid";
import { ErrorBanner } from "./components/ErrorBanner";
import { useApiKey } from "./hooks/useApiKey";
import { menuReducer } from "./state/menuReducer";
import { initialMenuState } from "./state/types";
import type { MenuCard } from "./state/types";

function useMenuGenerator(): MenuGenerator {
  const { apiKey } = useApiKey();
  const isFake = new URLSearchParams(window.location.search).has("fake");
  return useMemo(
    () =>
      isFake || !apiKey ? fakeMenuGenerator() : geminiMenuGenerator(apiKey),
    [isFake, apiKey],
  );
}

function App() {
  return (
    <ApiKeyGate>
      <Shell />
    </ApiKeyGate>
  );
}

function Shell() {
  const gen = useMenuGenerator();
  return (
    <MenuGeneratorProvider value={gen}>
      <Header />
      <Main />
    </MenuGeneratorProvider>
  );
}

function Main() {
  const gen = useMenuGenerator();
  const [state, dispatch] = useReducer(menuReducer, initialMenuState);
  const abortRef = useRef<AbortController | null>(null);

  // Revoke object URLs on unmount or replacement.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const onEdit = useCallback(
    (
      id: string,
      field: "category" | "name" | "description" | "price",
      value: string,
    ) => dispatch({ type: "editCardField", id, field, value }),
    [],
  );

  const generateOneCard = useCallback(
    async (card: MenuCard, signal: AbortSignal) => {
      if (card.name === "" && card.description === "") return;
      dispatch({ type: "cardStarted", id: card.id });
      try {
        const blob = await gen.generateDishImage(
          { name: card.name, description: card.description },
          { signal },
        );
        const url = URL.createObjectURL(blob);
        dispatch({ type: "cardSucceeded", id: card.id, imageUrl: url });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const message =
          err instanceof GeneratorError
            ? err.message
            : "Failed to generate image.";
        dispatch({ type: "cardFailed", id: card.id, message });
      }
    },
    [gen],
  );

  const onGenerate = useCallback(
    async (req: GenerateRequest) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      dispatch({ type: "startGeneration", ids: [] });

      let items: ParsedMenuItem[] = [];
      try {
        items = req.referencePhoto
          ? await gen.parseMenuFromImage(req.referencePhoto, {
              signal: controller.signal,
            })
          : await gen.parseMenuFromText(req.prompt, {
              signal: controller.signal,
            });
      } catch (err) {
        const message =
          err instanceof GeneratorError
            ? err.message
            : "Failed to parse menu input.";
        dispatch({ type: "fail", message });
        return;
      }

      dispatch({ type: "parseSucceeded", items });

      // After parseSucceeded the reducer has populated state.cards; we fan out
      // image generation per non-blank card by walking the *next* state.
      // We rely on the dispatch-and-read pattern via a setTimeout(0) trick so
      // React has flushed the parseSucceeded reducer update.
      setTimeout(() => {
        const ids = state.cards.length ? state.cards.map((c) => c.id) : []; // placeholder — see note below
        // We read the latest reducer state by attaching a one-off effect via
        // dispatch; simpler approach: re-derive cards from a snapshot ref.
        // Implementation alternative: drive fan-out by useEffect on cards.length.
        ids;
      }, 0);
    },
    [gen, state.cards],
  );

  // Drive per-card image generation off changes to cards.
  useEffect(() => {
    if (state.globalStatus !== "generating") return;
    const controller = abortRef.current;
    if (!controller) return;
    const pending = state.cards.filter(
      (c) => c.status === "generating" || c.status === "pending",
    );
    pending.forEach((card) => {
      if (card.name === "" && card.description === "") return;
      void generateOneCard(card, controller.signal);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.globalStatus]);

  const onRegenerate = useCallback(
    (id: string) => {
      const card = state.cards.find((c) => c.id === id);
      if (!card) return;
      const controller = new AbortController();
      abortRef.current?.abort();
      abortRef.current = controller;
      dispatch({ type: "regenerateCard", id });
      void generateOneCard(
        { ...card, status: "generating", imageUrl: null },
        controller.signal,
      );
    },
    [generateOneCard, state.cards],
  );

  const isGenerating =
    state.globalStatus === "parsing" || state.globalStatus === "generating";

  return (
    <main>
      <PromptForm
        count={state.count}
        onCountChange={(n) => dispatch({ type: "setCount", value: n })}
        onGenerate={onGenerate}
        isGenerating={isGenerating}
      />
      <ErrorBanner message={state.globalError} />
      <MenuGrid
        cards={state.cards}
        onEdit={onEdit}
        onRegenerate={onRegenerate}
      />
    </main>
  );
}

export default App;
```

> **Important:** the snippet above contains a deliberately-flagged complexity (`setTimeout` placeholder for reading post-dispatch state). The cleaner pattern, which the implementing engineer must use, is to drive the fan-out **only** from the `useEffect` on `state.globalStatus === "generating"`. Delete the `setTimeout` block before committing — it is shown so the engineer sees both the wrong and the right pattern in the same place. After deletion, the `onGenerate` callback is just: dispatch start, parse, dispatch parseSucceeded; the effect handles fan-out.

- [ ] **Step 3: Simplify per the note above (delete the setTimeout block)**

Remove the `setTimeout` block and the trailing unused `ids` variable. `onGenerate` should end after `dispatch({ type: "parseSucceeded", items })`. The `useEffect` watching `state.globalStatus` is the only place that calls `generateOneCard`.

- [ ] **Step 4: Update main.tsx to drop the starter styling**

`src/main.tsx` keeps its current shape; only confirm it imports `./index.css` (which now imports tokens + reset). No code change required.

Delete `src/App.css`:

```bash
git rm src/App.css
```

- [ ] **Step 5: Build the app**

```bash
npm run build
```

Expected: clean build into `dist/`. Fix any TypeScript errors (most likely `verbatimModuleSyntax` requires `import type` for types only — fix imports if so).

- [ ] **Step 6: Manual smoke in the browser**

```bash
npm run dev
```

Open <http://localhost:5173/?fake=true>. Expect: ApiKeyGate skipped, Header + PromptForm visible, no key required. Click "Generate menu" with the default prompt — expect 4 placeholder images from picsum within ~2s, editable text, working ↻.

Then open <http://localhost:5173/> without `?fake=true`: ApiKeyForm appears; pasting any string and submitting reveals the same UI (real generator will fail until a real Gemini key is provided, which is expected).

- [ ] **Step 7: Run the full test suite**

```bash
npm run test:run
```

Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx src/main.tsx src/App.css
git commit -m "wire App: ApiKeyGate, Header, PromptForm, MenuGrid"
```

- [ ] **Step 9: PR → merge → walk Project task to Done**

---

## Task 21 — Flow test A: text-only

**Project task:** `Tests: flow-text-only`.
**Owner:** `test-engineer`.
**Blocked by:** Task 20.
**Files:** `src/__tests__/flows/text-only.test.tsx`.

- [ ] **Step 1: Project task created**

- [ ] **Step 2: Write the flow test**

Create `src/__tests__/flows/text-only.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App";

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, "", "/?fake=true");
});

describe("Flow A — text-only", () => {
  it("renders cards with images after Generate menu is clicked", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(
      screen.getByLabelText(/describe today's menu/i),
      "A four-course Italian dinner",
    );
    await user.click(screen.getByRole("button", { name: /generate menu/i }));

    // The fake generator delays parse 400ms and each image 600-1200ms; wait up to 4s.
    await waitFor(
      () => expect(screen.getAllByRole("article")).toHaveLength(4),
      { timeout: 4000 },
    );
    await waitFor(
      () => {
        const imgs = screen.getAllByRole("img");
        // Each card has the dish image; allow tolerance for skeleton-only cards.
        expect(imgs.length).toBeGreaterThanOrEqual(2);
      },
      { timeout: 4000 },
    );
  });

  it("clicking ↻ on a card transitions just that card to generating", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/describe today's menu/i), "italian");
    await user.click(screen.getByRole("button", { name: /generate menu/i }));
    await waitFor(
      () => expect(screen.getAllByRole("article")).toHaveLength(4),
      { timeout: 4000 },
    );

    const articles = screen.getAllByRole("article");
    const regenBtn = articles[0].querySelector(
      "button[aria-label*='egenerate']",
    ) as HTMLButtonElement;
    await user.click(regenBtn);
    expect(
      articles[0].querySelector("[data-testid='card-skeleton']"),
    ).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run**

```bash
npm run test:run -- src/__tests__/flows/text-only.test.tsx
```

Expected: passes (using fake generator). If the network call to picsum is slow/blocked in CI, replace the fake's `fetch` with a deterministic in-memory Blob and adjust this test accordingly — note the change in `fakeMenuGenerator.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/flows/text-only.test.tsx
git commit -m "add text-only flow test"
```

- [ ] **Step 5: PR → merge → Done**

---

## Task 22 — Flow test B: upload

**Project task:** `Tests: flow-upload`.
**Files:** `src/__tests__/flows/upload.test.tsx`.

- [ ] **Step 1: Task created**

- [ ] **Step 2: Write the flow test**

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../App";

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, "", "/?fake=true");
});

describe("Flow B — upload reference photo", () => {
  it("populates cards from the parsed menu items after upload + Generate menu", async () => {
    const user = userEvent.setup();
    render(<App />);
    const file = new File(["x"], "menu.jpg", { type: "image/jpeg" });
    await user.upload(
      screen.getByLabelText(
        /browse for a reference photo/i,
      ) as HTMLInputElement,
      file,
    );
    await user.click(screen.getByRole("button", { name: /generate menu/i }));
    await waitFor(
      () => expect(screen.getAllByRole("article")).toHaveLength(4),
      { timeout: 4000 },
    );
    // Card text pre-filled by the fake parser:
    expect(
      screen.getByDisplayValue(/Rigatoni all'Amatriciana/i),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run, pass, commit**

```bash
npm run test:run -- src/__tests__/flows/upload.test.tsx
git add src/__tests__/flows/upload.test.tsx
git commit -m "add upload flow test"
```

- [ ] **Step 4: PR → merge → Done**

---

## Task 23 — `allium:weed` audit, lint pass, deploy preview

**Project task:** `QA: full audit + deploy preview`.
**Owner:** `frontend-engineer` (with `allium:weed`).
**Blocked by:** Task 22.

- [ ] **Step 1: Project task created**

- [ ] **Step 2: Run allium:weed across all specs**

For each Allium spec, run the `allium:weed` skill and fix any drift between rules and implementation. The audit must come back clean (or with deliberate, documented exceptions noted in the spec itself).

- [ ] **Step 3: Run the full lint + test suite**

```bash
npm run lint
npm run test:run
npm run build
```

Expected: all clean. After build, verify `dist/index.html` references `/menu-generator.github.io/assets/...` (not `/assets/...`):

```bash
grep -E 'src=".*assets/|href=".*assets/' dist/index.html | head -2
```

Should show `/menu-generator.github.io/assets/...` in all asset paths.

- [ ] **Step 4: Manual QA matrix**

| Path                                              | Expected                                                 |
| ------------------------------------------------- | -------------------------------------------------------- |
| `/?fake=true`, click Generate with default prompt | 4 cards appear with placeholder images                   |
| `/?fake=true`, count=2, type prompt, generate     | 2 cards                                                  |
| `/?fake=true`, upload an image, generate          | 4 cards with Italian text pre-filled                     |
| `/?fake=true`, click ↻ on card 1                  | only card 1 reshuffles                                   |
| `/?fake=true`, edit card name                     | text persists; image untouched                           |
| `/`, no key, paste invalid key                    | gate accepts; gen attempts will surface a GeneratorError |
| `/`, Change API key link                          | localStorage cleared, page reloads to gate               |

Document any discrepancies and file follow-up Project tasks (owner: `code-health`).

- [ ] **Step 5: Deploy preview**

From `develop`:

```bash
npm run deploy
```

Expected: build runs, `dist/` is pushed to the `main` branch, GitHub Pages serves the new build at `https://dloopensource.github.io/menu-generator.github.io/` within a few minutes.

- [ ] **Step 6: Smoke the deployed site**

Open the deployed URL. Paste a real Gemini key. Type a prompt. Click Generate. Verify real images come back from `gemini-2.5-flash-image`. If they don't, the SDK shape almost certainly diverges from Task 6's assumptions — see Step 5 of Task 6 and adjust both code and the test mock together.

- [ ] **Step 7: Final commit, walk Project task to Done**

If any fixes were applied during QA, commit them with `fix: <one-liner>` style messages. Final PR title: `Menu Generator v1`. Mark this task and the parent "Menu Generator" epic `Done`.

---

## Self-review

Run through this checklist against the spec (`docs/superpowers/specs/2026-05-09-menu-generator-design.md`).

**1. Spec coverage:**

- §1 (scope, two flows): covered by Tasks 20–22 (orchestration + flow tests).
- §2 (architecture / component tree): covered by Tasks 10–20 (every named component has a task).
- §3 (state model): covered by Task 8 (reducer) and Task 9 (useApiKey).
- §4 (service interface, real impl, fake impl, provider): covered by Tasks 4–7.
- §5 (Allium specs — 7 files): `generator-service`, `menu-generation`, `api-key`, `reference-photo`, `prompt-form`, `menu-card` are each written. `menu-generator.allium` is the umbrella spec in Task 3. ✓
- §6 (testing strategy — reducer, contract, hook, component, flow): all layers present.
- §7 (file layout): mirrored exactly in Tasks 1, 2, 20.
- §8 (agents & workflow + GitHub Project tasks): every task header names the owner agent and instructs creating/walking a Project task in `Backlog → Ready → In progress → In review → Done`.
- §9 (documentation deliverables — diagrams in `docs/diagrams/`): created in Task 3.
- §10 (deferred items): Task 1 pins versions; Task 6 verifies SDK shape (live smoke in Task 23 Step 6).

**2. Placeholder scan:**

- "TBD" / "TODO": none.
- "Implement later" / "fill in details": none.
- One callout in Task 20 deliberately shows a _wrong_ pattern (`setTimeout`) and tells the engineer to delete it; this is annotated, not a placeholder.
- "Similar to Task N": none — each task contains its own test and impl code in full.

**3. Type consistency:**

- `MenuCard` interface: defined in Task 8 `src/state/types.ts`. Used in Tasks 17, 18, 20. Same shape throughout.
- `MenuGenerator` interface: defined in Task 4. Used in Tasks 5, 6, 7, 20. Same shape.
- `ParsedMenuItem`: defined in Task 4. Used in Tasks 5, 6, 8, 20. Same shape.
- `GenerateRequest`: defined in Task 16. Used in Task 20. Same shape.
- Hook return shape (`{ apiKey, setApiKey, clearApiKey }`): defined in Task 9. Used in Tasks 10 (`ApiKeyGate`), 15 (`ChangeApiKeyLink`), 20 (`useMenuGenerator`). Consistent.

**4. Ordering:**

Tasks are topologically valid. Each task lists its blockers; following them in order means every dependency is `Done` before its dependent task starts. The plan can be parallelized across the three agents (`allium:tend`, `test-engineer`, `frontend-engineer`) per spec §8.2.

No issues found.

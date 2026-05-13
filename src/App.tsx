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
    () => (isFake || !apiKey ? fakeMenuGenerator() : geminiMenuGenerator(apiKey)),
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

  // Abort any in-flight work on unmount.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const onEdit = useCallback(
    (id: string, field: "category" | "name" | "description" | "price", value: string) =>
      dispatch({ type: "editCardField", id, field, value }),
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
          err instanceof GeneratorError ? err.message : "Failed to generate image.";
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
      dispatch({ type: "startGeneration" });

      let items: ParsedMenuItem[];
      try {
        items = req.referencePhoto
          ? await gen.parseMenuFromImage(req.referencePhoto, { signal: controller.signal })
          : await gen.parseMenuFromText(req.prompt, { signal: controller.signal });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const message =
          err instanceof GeneratorError ? err.message : "Failed to parse menu input.";
        dispatch({ type: "fail", message });
        return;
      }

      dispatch({ type: "parseSucceeded", items });
      // Per-card image generation fan-out is driven by the useEffect below
      // watching state.globalStatus === "generating".
    },
    [gen],
  );

  // Drive per-card image generation off changes to cards. Fires when
  // parseSucceeded transitions globalStatus to "generating".
  useEffect(() => {
    if (state.globalStatus !== "generating") return;
    const controller = abortRef.current;
    if (!controller) return;
    const inFlight = state.cards.filter((c) => c.status === "generating");
    inFlight.forEach((card) => {
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
      void generateOneCard({ ...card, status: "generating", imageUrl: null }, controller.signal);
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
      <MenuGrid cards={state.cards} onEdit={onEdit} onRegenerate={onRegenerate} />
    </main>
  );
}

export default App;

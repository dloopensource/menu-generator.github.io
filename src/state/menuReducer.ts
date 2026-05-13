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

function cryptoRandom() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
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
        status: item.name === "" && item.description === "" ? "pending" : "generating",
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

export { initialMenuState };

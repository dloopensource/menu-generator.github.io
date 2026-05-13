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
  count: number;
  cards: MenuCard[];
  globalStatus: GlobalStatus;
  globalError: string | null;
};

export type MenuAction =
  | { type: "setPrompt"; value: string }
  | { type: "setCount"; value: number }
  | { type: "startGeneration" }
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
  count: 4,
  cards: [],
  globalStatus: "idle",
  globalError: null,
};

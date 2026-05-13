import { describe, it, expect } from "vitest";
import { menuReducer } from "./menuReducer";
import { initialMenuState, type MenuState, type MenuCard } from "./types";

function withCards(overrides: Partial<MenuState>, cards: MenuCard[]): MenuState {
  return { ...initialMenuState, ...overrides, cards };
}

function makeCard(id: string, status: MenuCard["status"] = "pending"): MenuCard {
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
    const next = menuReducer(initialMenuState, { type: "setPrompt", value: "hi" });
    expect(next.prompt).toBe("hi");
  });

  it("setCount clamps to [1, 8]", () => {
    expect(menuReducer(initialMenuState, { type: "setCount", value: 0 }).count).toBe(1);
    expect(menuReducer(initialMenuState, { type: "setCount", value: 99 }).count).toBe(8);
    expect(menuReducer(initialMenuState, { type: "setCount", value: 4 }).count).toBe(4);
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
    const a = menuReducer(state, { type: "cardSucceeded", id: "a", imageUrl: "u" });
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

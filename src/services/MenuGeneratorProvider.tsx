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

// eslint-disable-next-line react-refresh/only-export-components
export function useGenerator(): MenuGenerator {
  const gen = useContext(Ctx);
  if (!gen) {
    throw new Error("useGenerator must be used inside <MenuGeneratorProvider>");
  }
  return gen;
}

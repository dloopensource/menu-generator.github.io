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

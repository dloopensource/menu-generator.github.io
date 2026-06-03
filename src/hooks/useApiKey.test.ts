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

  it("treats whitespace-only setApiKey as a clear (does not persist empty string)", () => {
    window.localStorage.setItem(API_KEY_STORAGE_KEY, "previous-key");
    const { result } = renderHook(() => useApiKey());
    expect(result.current.apiKey).toBe("previous-key");
    act(() => result.current.setApiKey("   "));
    expect(result.current.apiKey).toBeNull();
    expect(window.localStorage.getItem(API_KEY_STORAGE_KEY)).toBeNull();
  });
});

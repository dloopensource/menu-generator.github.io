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

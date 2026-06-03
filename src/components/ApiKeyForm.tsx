import { useState, type FormEvent } from "react";
import styles from "./ApiKeyForm.module.css";

export function ApiKeyForm({ onSave }: { onSave: (key: string) => void }) {
  const [value, setValue] = useState("");
  const trimmed = value.trim();
  const canSave = trimmed.length > 0;

  function handleSubmit(e: FormEvent) {
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

import { useState, type FormEvent } from "react";
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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (canSubmit)
      onGenerate({ prompt: prompt.trim(), referencePhoto: photo, count });
  }

  return (
    <form className={styles.card} onSubmit={handleSubmit}>
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
          <button
            type="submit"
            className={styles.cta}
            disabled={!canSubmit}
            aria-label="generate menu"
          >
            {isGenerating ? "Generating…" : "Generate menu"}
          </button>
        </div>
        <ChangeApiKeyLink />
      </div>
    </form>
  );
}

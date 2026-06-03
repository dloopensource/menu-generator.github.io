/* eslint-disable react-refresh/only-export-components */
import styles from "./SuggestionChips.module.css";

export const SUGGESTIONS = [
  {
    label: "Italian tasting menu",
    prompt: "An Italian tasting menu with antipasto, pasta, main, and a dolce.",
  },
  {
    label: "Sunday brunch",
    prompt:
      "A relaxed Sunday brunch with eggs, pancakes, a salad, and a coffee drink.",
  },
  {
    label: "Cocktail flight",
    prompt: "Four cocktails of contrasting styles served as a flight.",
  },
  {
    label: "Trattoria dinner",
    prompt:
      "A rustic trattoria dinner with bread, antipasto, a hearty pasta, and tiramisu.",
  },
] as const;

export function SuggestionChips({
  onPick,
}: {
  onPick: (prompt: string) => void;
}) {
  return (
    <div className={styles.row}>
      {SUGGESTIONS.map((s) => (
        <button
          key={s.label}
          type="button"
          className={styles.chip}
          onClick={() => onPick(s.prompt)}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

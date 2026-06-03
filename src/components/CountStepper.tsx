import { MIN_COUNT, MAX_COUNT } from "../state/constants";
import styles from "./CountStepper.module.css";

export function CountStepper({
  value,
  onChange,
  min = MIN_COUNT,
  max = MAX_COUNT,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.btn}
        aria-label="Decrease"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <span className={styles.value} aria-label="Menu item count">
        {value}
      </span>
      <button
        type="button"
        className={styles.btn}
        aria-label="Increase"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}

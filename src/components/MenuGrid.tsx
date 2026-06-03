import styles from "./MenuGrid.module.css";
import type { MenuCard as Card } from "../state/types";
import { MenuCard } from "./MenuCard";

export function MenuGrid({
  cards,
  onEdit,
  onRegenerate,
}: {
  cards: Card[];
  onEdit: (id: string, field: "category" | "name" | "description" | "price", value: string) => void;
  onRegenerate: (id: string) => void;
}) {
  if (cards.length === 0) return null;
  const readyCount = cards.filter((c) => c.status === "ready").length;
  return (
    <section className={styles.section}>
      <h2 className={styles.subtitle}>
        <span>{cards.length === 1 ? "One course, plated" : `${cards.length} courses, plated`}</span>
        <span className={styles.badge}>{readyCount} ready</span>
      </h2>
      <div className={styles.grid}>
        {cards.map((c) => (
          <MenuCard key={c.id} card={c} onEdit={onEdit} onRegenerate={onRegenerate} />
        ))}
      </div>
    </section>
  );
}

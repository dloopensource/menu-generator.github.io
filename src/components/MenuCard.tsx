import { useState } from "react";
import styles from "./MenuCard.module.css";
import type { MenuCard as Card } from "../state/types";

export function MenuCard({
  card,
  onEdit,
  onRegenerate,
}: {
  card: Card;
  onEdit: (id: string, field: "category" | "name" | "description" | "price", value: string) => void;
  onRegenerate: (id: string) => void;
}) {
  const [editedValues, setEditedValues] = useState({
    category: card.category,
    name: card.name,
    description: card.description,
    price: card.price,
  });

  const handleEdit = (field: "category" | "name" | "description" | "price", value: string) => {
    setEditedValues((prev) => ({ ...prev, [field]: value }));
    onEdit(card.id, field, value);
  };

  const showSkeleton = card.status === "generating" || card.status === "pending";

  return (
    <article className={styles.card}>
      <div className={styles.imgWrap}>
        {card.status === "ready" && card.imageUrl ? (
          <img className={styles.img} src={card.imageUrl} alt={card.name || "Generated dish"} />
        ) : showSkeleton ? (
          <div className={styles.skel} data-testid="card-skeleton" />
        ) : (
          <p className={styles.error}>{card.errorMessage ?? "Failed to generate"}</p>
        )}
        <input
          className={styles.catInput}
          aria-label="Category"
          value={editedValues.category}
          onChange={(e) => handleEdit("category", e.target.value)}
          placeholder="CATEGORY"
        />
        <button
          type="button"
          className={styles.regen}
          aria-label={card.status === "error" ? "Retry / regenerate" : "Regenerate"}
          onClick={() => onRegenerate(card.id)}
        >
          ↻
        </button>
      </div>
      <div className={styles.body}>
        <div className={styles.row}>
          <input
            className={styles.name}
            aria-label="Name"
            value={editedValues.name}
            onChange={(e) => handleEdit("name", e.target.value)}
            placeholder="Dish name"
          />
          <input
            className={styles.price}
            aria-label="Price"
            value={editedValues.price}
            onChange={(e) => handleEdit("price", e.target.value)}
            placeholder="$0"
          />
        </div>
        <textarea
          className={styles.desc}
          aria-label="Description"
          value={editedValues.description}
          onChange={(e) => handleEdit("description", e.target.value)}
          placeholder="Short description"
          rows={2}
        />
      </div>
    </article>
  );
}

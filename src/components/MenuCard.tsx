import { useEffect, useRef, useState } from "react";
import styles from "./MenuCard.module.css";
import type { MenuCard as Card } from "../state/types";

export function MenuCard({
  card,
  onEdit,
  onRegenerate,
}: {
  card: Card;
  onEdit: (
    id: string,
    field: "category" | "name" | "description" | "price",
    value: string,
  ) => void;
  onRegenerate: (id: string) => void;
}) {
  const [editedValues, setEditedValues] = useState({
    category: card.category,
    name: card.name,
    description: card.description,
    price: card.price,
  });

  const lastCardRef = useRef(card);

  useEffect(() => {
    if (
      card.category !== lastCardRef.current.category ||
      card.name !== lastCardRef.current.name ||
      card.description !== lastCardRef.current.description ||
      card.price !== lastCardRef.current.price
    ) {
      setEditedValues({
        category: card.category,
        name: card.name,
        description: card.description,
        price: card.price,
      });
      lastCardRef.current = card;
    }
  }, [card]);

  const handleEdit = (
    field: "category" | "name" | "description" | "price",
    value: string,
  ) => {
    setEditedValues((prev) => ({ ...prev, [field]: value }));
    onEdit(card.id, field, value);
  };

  useEffect(() => {
    const url = card.imageUrl;
    if (!url || !url.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(url);
  }, [card.imageUrl]);

  const showSkeleton =
    card.status === "generating" || card.status === "pending";
  const regenerateDisabled =
    card.status === "pending" && card.name === "" && card.description === "";

  return (
    <article className={styles.card}>
      <div className={styles.imgWrap}>
        {card.status === "ready" && card.imageUrl ? (
          <img
            className={styles.img}
            src={card.imageUrl}
            alt={card.name || "Generated dish"}
          />
        ) : showSkeleton ? (
          <div className={styles.skel} data-testid="card-skeleton" />
        ) : (
          <p className={styles.error}>
            {card.errorMessage ?? "Failed to generate"}
          </p>
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
          aria-label={
            card.status === "error" ? "Retry / regenerate" : "Regenerate"
          }
          disabled={regenerateDisabled}
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

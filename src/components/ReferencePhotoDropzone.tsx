import { useEffect, useState, type DragEvent } from "react";
import styles from "./ReferencePhotoDropzone.module.css";

const ACCEPTED = ["image/png", "image/jpeg"];

export function ReferencePhotoDropzone({
  file,
  onFileChange,
}: {
  file: File | null;
  onFileChange: (file: File | null) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handlePick(f: File | null) {
    if (!f) return onFileChange(null);
    if (!ACCEPTED.includes(f.type)) return onFileChange(null);
    onFileChange(f);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0] ?? null;
    handlePick(f);
  }

  if (file && previewUrl) {
    return (
      <div className={styles.zone}>
        <div className={styles.file}>
          <img className={styles.thumb} src={previewUrl} alt="" />
          <span className={styles.name}>{file.name}</span>
          <button
            type="button"
            className={styles.remove}
            onClick={() => onFileChange(null)}
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={styles.zone}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <span className={styles.label}>
        Drop a reference photo. PNG or JPG, or{" "}
        <label className={styles.browse}>
          browse
          <input
            type="file"
            accept={ACCEPTED.join(",")}
            className={styles.hidden}
            aria-label="browse for a reference photo"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              handlePick(f);
            }}
          />
        </label>
        .
      </span>
    </div>
  );
}

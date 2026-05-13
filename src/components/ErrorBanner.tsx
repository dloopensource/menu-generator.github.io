import styles from "./ErrorBanner.module.css";

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className={styles.banner} role="alert">
      {message}
    </div>
  );
}

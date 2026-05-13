import styles from "./Header.module.css";

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.mark} aria-hidden="true">+</div>
      <div className={styles.wordmark}>
        <h1 className={styles.title}>Menu Generator</h1>
        <p className={styles.tagline}>Create your graphical menu</p>
      </div>
    </header>
  );
}

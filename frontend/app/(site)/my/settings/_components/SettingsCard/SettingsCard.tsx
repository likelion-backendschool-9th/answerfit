import type { ReactNode } from "react";
import styles from "./SettingsCard.module.css";

export function SettingsCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className={styles.card}>
      <h2 className={styles.title}>{title}</h2>
      {description && <p className={styles.description}>{description}</p>}
      {children}
    </section>
  );
}

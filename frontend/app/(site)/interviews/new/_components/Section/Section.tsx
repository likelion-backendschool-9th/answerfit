import type { ReactNode } from "react";
import styles from "./Section.module.css";

type Props = { title: string; description?: ReactNode; children: ReactNode };

export function Section({ title, description, children }: Props) {
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{title}</h2>
      {description && <p className={styles.description}>{description}</p>}
      <div className={styles.body}>{children}</div>
    </section>
  );
}

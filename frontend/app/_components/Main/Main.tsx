import type { ReactNode } from "react";
import styles from "./Main.module.css";

export function Main({ children }: { children: ReactNode }) {
  return (
    <main id="main" tabIndex={-1} className={styles.main}>
      {children}
    </main>
  );
}

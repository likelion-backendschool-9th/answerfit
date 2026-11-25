import type { ComponentProps, ReactNode } from "react";
import styles from "./Checkbox.module.css";

type Props = Omit<ComponentProps<"input">, "type" | "className"> & { children: ReactNode };

export function Checkbox({ children, ...props }: Props) {
  return (
    <label className={styles.checkbox}>
      <span className={styles.box}>
        <input type="checkbox" className={styles.input} {...props} />
        <svg className={styles.mark} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M4.5 12.5 9.5 17.5 20 7" />
        </svg>
      </span>
      <span>{children}</span>
    </label>
  );
}

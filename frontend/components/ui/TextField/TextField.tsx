import type { ComponentProps } from "react";
import { useId } from "react";
import styles from "./TextField.module.css";

type Props = Omit<ComponentProps<"input">, "id" | "className"> & { label: string; hint?: string; error?: string };

/** 오류가 있으면 안내 문구 대신 오류를 보여 준다 */
export function TextField({ label, hint, error, ...props }: Props) {
  const id = useId();
  const message = error ?? hint;
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        id={id}
        className={styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? `${id}-message` : undefined}
        {...props}
      />
      {message && (
        <p id={`${id}-message`} className={error ? styles.error : styles.hint}>
          {message}
        </p>
      )}
    </div>
  );
}

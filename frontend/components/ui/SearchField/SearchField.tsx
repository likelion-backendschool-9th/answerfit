import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "../Icon/Icon";
import styles from "./SearchField.module.css";

type Props = Omit<ComponentProps<"input">, "type" | "size"> & { label: string; size?: "md" | "sm" };

export function SearchField({ label, size = "md", className, ...props }: Props) {
  return (
    <label className={cn(styles.field, styles[size], className)}>
      <Icon name="search" size={20} />
      <input type="search" className={styles.input} aria-label={label} placeholder={label} maxLength={100} {...props} />
    </label>
  );
}

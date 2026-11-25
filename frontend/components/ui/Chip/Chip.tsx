import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import styles from "./Chip.module.css";

export function Chip({ tone = "light", children }: { tone?: "light" | "dark"; children: ReactNode }) {
  return <span className={cn(styles.chip, styles[tone])}>{children}</span>;
}

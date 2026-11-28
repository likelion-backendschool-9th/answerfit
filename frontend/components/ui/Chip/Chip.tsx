import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import styles from "./Chip.module.css";

/** sm은 표 셀처럼 줄 높이가 낮은 곳에 쓴다 */
export function Chip({ tone = "light", size = "md", children }: { tone?: "light" | "dark"; size?: "md" | "sm"; children: ReactNode }) {
  return <span className={cn(styles.chip, styles[tone], size === "sm" && styles.sm)}>{children}</span>;
}

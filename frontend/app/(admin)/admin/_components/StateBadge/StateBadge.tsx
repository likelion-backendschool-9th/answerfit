import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import styles from "./StateBadge.module.css";

export type BadgeTone = "success" | "accent" | "danger" | "warning" | "muted";

export function StateBadge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return <span className={cn(styles.badge, styles[tone])}>{children}</span>;
}

import type { Rating } from "@/features/interview/result";
import { cn } from "@/lib/cn";
import styles from "./RatingBadge.module.css";

export function RatingBadge({ rating: { label, tone } }: { rating: Rating }) {
  return <span className={cn(styles.badge, styles[tone])}>{label}</span>;
}

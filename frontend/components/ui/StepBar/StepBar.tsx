import { cn } from "@/lib/cn";
import styles from "./StepBar.module.css";

export function StepBar({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className={styles.list}>
      {steps.map((name, index) => (
        <li key={name} className={cn(styles.item, index < current && styles.reached)} aria-current={index + 1 === current ? "step" : undefined}>
          {index + 1}. {name}
        </li>
      ))}
    </ol>
  );
}

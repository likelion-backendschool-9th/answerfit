import { cn } from "@/lib/cn";
import styles from "./SignupSteps.module.css";

const STEPS = ["계정", "프로필", "완료"];

export function SignupSteps({ step }: { step: number }) {
  return (
    <div className={styles.steps}>
      <p className={styles.current}>
        STEP {step} / {STEPS.length}
      </p>
      <ol className={styles.list}>
        {STEPS.map((name, index) => (
          <li key={name} className={cn(styles.item, index < step && styles.reached)} aria-current={index + 1 === step ? "step" : undefined}>
            {index + 1}. {name}
          </li>
        ))}
      </ol>
    </div>
  );
}

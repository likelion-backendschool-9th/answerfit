import { StepBar } from "@/components/ui/StepBar/StepBar";
import styles from "./SignupSteps.module.css";

const STEPS = ["계정", "프로필", "완료"];

export function SignupSteps({ step }: { step: number }) {
  return (
    <div className={styles.steps}>
      <p className={styles.current}>
        STEP {step} / {STEPS.length}
      </p>
      <StepBar steps={STEPS} current={step} />
    </div>
  );
}

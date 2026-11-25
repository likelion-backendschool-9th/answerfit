"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon/Icon";
import { cn } from "@/lib/cn";
import styles from "./AnalyzingCard.module.css";

/** 진행 중 문구와 끝난 문구 */
const STEPS = [
  { doing: "말한 내용을 글자로 바꾸고 있어요", done: "말한 내용을 글자로 바꿨어요" },
  { doing: "핵심 키워드가 들어 있는지 확인하고 있어요", done: "핵심 키워드를 확인했어요" },
  { doing: "꼬리 질문이 필요한지 판단해요", done: "" },
];
const STEP_MS = 1500;

/** 단계는 시간에 맞춰 넘긴다. 실제 진행 상황을 알려 주는 API는 미확정 */
export function AnalyzingCard() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setStep((current) => Math.min(current + 1, STEPS.length - 1)), STEP_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={styles.scrim}>
      <div className={styles.card} role="status">
        <div className={styles.top}>
          <span className={cn(styles.spin, styles.accent)}>
            <Icon name="spinner" size={32} />
          </span>
          <div>
            <p className={styles.title}>답변을 분석하고 있어요</p>
            <p className={styles.description}>보통 5~10초 걸려요</p>
          </div>
        </div>
        <ul className={styles.steps}>
          {STEPS.map(({ doing, done }, i) => (
            <li key={doing} className={cn(styles.step, i > step && styles.waiting)}>
              <span className={cn(i < step && styles.done, i === step && styles.accent, i === step && styles.spin)}>
                <Icon name={i < step ? "check" : i === step ? "spinner" : "circle"} size={20} />
              </span>
              {i < step ? done : doing}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

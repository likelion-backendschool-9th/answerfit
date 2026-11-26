"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button/Button";
import { StepBar } from "@/components/ui/StepBar/StepBar";
import { startInterviewAction } from "@/features/interview/actions";
import { needsDocuments, setupError } from "@/features/interview/setup";
import type { DocumentGroup, InterviewSetup as Setup } from "@/features/interview/types";
import { CheckStep } from "../CheckStep/CheckStep";
import { InfoStep } from "../InfoStep/InfoStep";
import styles from "./InterviewSetup.module.css";

type Props = { initial: Setup; groups: DocumentGroup[]; gazeReady: boolean; today: string };

export function InterviewSetup({ initial, groups, gazeReady, today }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [setup, setSetup] = useState(initial);
  const [error, setError] = useState<string>();
  const [devicesReady, setDevicesReady] = useState(false);
  const [pending, startTransition] = useTransition();
  const title = useRef<HTMLHeadingElement>(null);
  const shownStep = useRef(step);

  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    title.current?.focus();
    window.scrollTo(0, 0);
  }, [step]);

  // 서류는 경험·인성 면접에서만 쓴다. 영상 보관 기간은 모든 유형에 쓴다
  const effective: Setup = needsDocuments(setup.type) ? setup : { ...setup, groupId: null };

  function goNext() {
    const problem = setupError(effective, groups, today);
    setError(problem);
    if (!problem) setStep(2);
  }

  function start() {
    setError(undefined);
    startTransition(async () => {
      const result = await startInterviewAction(effective);
      if (result) setError(result.error);
    });
  }

  function goBack() {
    setError(undefined);
    setDevicesReady(false);
    setStep(1);
  }

  return (
    <div className={styles.content}>
      <h1 className={styles.title} ref={title} tabIndex={-1}>
        모의 면접 준비
      </h1>
      <p className={styles.description}>두 단계만 확인하면 바로 시작해요.</p>
      <div className={styles.steps}>
        <StepBar steps={["면접 정보", "환경 점검"]} current={step} />
      </div>
      {step === 1 ? <InfoStep setup={setup} groups={groups} today={today} onChange={setSetup} /> : <CheckStep gazeReady={gazeReady} onReadyChange={setDevicesReady} />}
      <div className={styles.actions}>
        <p className={styles.error} role="alert">
          {error}
        </p>
        {step === 1 ? (
          <Button className={styles.primary} onClick={goNext}>
            다음 · 환경 점검
          </Button>
        ) : (
          <>
            <Button variant="outline" className={styles.secondary} onClick={goBack} disabled={pending}>
              이전 단계
            </Button>
            <Button className={styles.primary} onClick={start} disabled={pending || !devicesReady}>
              {pending ? "준비 중" : "면접 시작하기"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

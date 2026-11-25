"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { StepBar } from "@/components/ui/StepBar/StepBar";
import { startInterviewAction } from "@/features/interview/actions";
import { setupError } from "@/features/interview/setup";
import type { DocumentGroup, InterviewSetup as Setup } from "@/features/interview/types";
import { CheckStep } from "../CheckStep/CheckStep";
import { InfoStep } from "../InfoStep/InfoStep";
import { SummaryCard } from "../SummaryCard/SummaryCard";
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

  // CS 면접은 서류를 쓰지 않는다
  const effective: Setup = setup.type === "experience" ? setup : { ...setup, groupId: null, deleteAfter: null };
  const group = groups.find(({ id }) => id === effective.groupId) ?? null;

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
    <div className={styles.layout}>
      <div className={styles.content}>
        <h1 className={styles.title} ref={title} tabIndex={-1}>
          모의 면접 준비
        </h1>
        <p className={styles.description}>두 단계만 확인하면 바로 시작해요. 고른 내용은 오른쪽 요약에서 바로 확인할 수 있어요.</p>
        <div className={styles.steps}>
          <StepBar steps={["면접 정보", "환경 점검"]} current={step} />
        </div>
        {step === 1 ? (
          <InfoStep setup={setup} groups={groups} today={today} onChange={setSetup} />
        ) : (
          <CheckStep mode={setup.mode} gazeReady={gazeReady} onReadyChange={setDevicesReady} />
        )}
      </div>
      <SummaryCard setup={effective} group={group} error={error}>
        {step === 1 ? { next: goNext } : { start, back: goBack, pending, ready: devicesReady }}
      </SummaryCard>
    </div>
  );
}

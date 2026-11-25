"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PATHS } from "@/app/_lib/paths";
import { Button, ButtonLink } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { analysisProgressAction } from "@/features/interview/actions";
import { ANALYSIS_STEPS, COMMENT_STEP, type AnalysisProgress as Progress } from "@/features/interview/analysis";
import { cn } from "@/lib/cn";
import styles from "./AnalysisProgress.module.css";

const POLL_MS = 1000;
const RADIUS = 60;
const AROUND = 2 * Math.PI * RADIUS;

export function AnalysisProgress({ id, initial }: { id: string; initial: Progress }) {
  const router = useRouter();
  const [progress, setProgress] = useState(initial);
  const [error, setError] = useState<string>();
  const { percent, step, total, commented, done } = progress;

  useEffect(() => {
    if (done || error) return;
    let left = false;
    const timer = setTimeout(async () => {
      const result = await analysisProgressAction(id).catch(() => ({ error: "진행 상황을 확인하지 못했어요." }));
      if (left) return;
      if ("error" in result) setError(result.error);
      else setProgress(result.progress);
    }, POLL_MS);
    return () => {
      left = true;
      clearTimeout(timer);
    };
  }, [id, progress, done, error]);

  useEffect(() => {
    if (done) router.replace(PATHS.interviewResult(id));
  }, [done, id, router]);

  return (
    <div className={styles.content}>
      <div className={styles.ring} role="progressbar" aria-label="결과 정리" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <svg viewBox="0 0 128 128" aria-hidden="true">
          <circle className={styles.track} cx="64" cy="64" r={RADIUS} />
          <circle className={styles.value} cx="64" cy="64" r={RADIUS} strokeDasharray={`${(AROUND * percent) / 100} ${AROUND}`} />
        </svg>
        <span className={styles.percent}>{percent}%</span>
      </div>
      <h1 className={styles.title}>
        수고하셨어요.
        <br />
        면접 결과를 정리하고 있어요
      </h1>
      <p className={styles.description}>답변 {total}개의 내용과 시선, 답변 시간을 함께 살펴보고 있어요. 1~2분 정도 걸려요.</p>
      <ol className={styles.steps}>
        {ANALYSIS_STEPS.map(({ title, doing, done: finished, waiting }, i) => {
          const status = i < step ? "done" : i === step ? "doing" : "waiting";
          return (
            <li key={title} className={cn(styles.step, styles[status])}>
              <span className={styles.icon}>
                <Icon name={status === "done" ? "check" : status === "doing" ? "spinner" : "circle"} />
              </span>
              <span className={styles.text}>
                <span className={styles.name}>{title}</span>
                <span className={styles.detail}>{status === "done" ? finished : status === "doing" ? doing : waiting}</span>
              </span>
              {i === COMMENT_STEP && status === "doing" && (
                <span className={styles.count}>
                  {commented} / {total}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {error ? (
        <div className={styles.error} role="alert">
          <p>{error}</p>
          <Button variant="outline" onClick={() => setError(undefined)}>
            다시 확인
          </Button>
        </div>
      ) : (
        <div className={styles.info}>
          <Icon name="info" size={20} />
          <div>
            <p className={styles.infoTitle}>이 창을 닫아도 분석은 계속돼요.</p>
            <p className={styles.infoText}>끝나면 마이페이지 › 면접 기록에서 같은 결과를 볼 수 있어요.</p>
          </div>
        </div>
      )}
      <ButtonLink href={PATHS.home} variant="outline" className={styles.home}>
        메인페이지로 이동하기
      </ButtonLink>
    </div>
  );
}

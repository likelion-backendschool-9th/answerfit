import type { ReactNode } from "react";
import { duration, rateScore, rateTime, timeNote, type ResultItem } from "@/features/interview/result";
import { cn } from "@/lib/cn";
import styles from "./ScoreCard.module.css";

/** 답변 시간 막대가 가득 차는 길이(초) */
const FULL_SECONDS = 180;

export function ScoreCard({ item }: { item: ResultItem }) {
  const time = rateTime(item.seconds);
  return (
    <section className={styles.card} aria-label="점수">
      <div className={styles.total}>
        <div>
          <p className={styles.name}>종합 점수</p>
          <p className={styles.note}>답변 정확도와 전달 방식을 합친 점수예요</p>
        </div>
        <p className={styles.score}>{item.score}</p>
      </div>
      <Row name="답변 정확도" value={item.accuracy} unit="/ 100" percent={item.accuracy} tone={rateScore(item.accuracy).tone === "bad" ? "bad" : "accent"} note={item.accuracyNote} />
      <Row name="시선 처리" value={item.gaze} unit="/ 100" percent={item.gaze} tone={rateScore(item.gaze).tone === "bad" ? "bad" : "good"} note={item.gazeNote} />
      <Row name="답변 시간" value={duration(item.seconds)} unit={time.label} percent={Math.min(100, (item.seconds / FULL_SECONDS) * 100)} tone={time.tone === "good" ? "good" : "bad"} note={timeNote(item.seconds)} />
    </section>
  );
}

type RowProps = { name: string; value: ReactNode; unit: string; percent: number; tone: "accent" | "good" | "bad"; note: string };

function Row({ name, value, unit, percent, tone, note }: RowProps) {
  return (
    <div className={styles.row}>
      <p className={styles.top}>
        <span className={styles.rowName}>{name}</span>
        <span className={styles.value}>{value}</span>
        <span className={styles.unit}>{unit}</span>
      </p>
      <span className={styles.track}>
        <span className={cn(styles.fill, styles[tone])} style={{ width: `${percent}%` }} />
      </span>
      <p className={styles.note}>{note}</p>
    </div>
  );
}

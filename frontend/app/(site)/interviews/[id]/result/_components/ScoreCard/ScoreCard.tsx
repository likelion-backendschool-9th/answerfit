import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon/Icon";
import { duration, rateScore, rateTime, timeNote, type Rating, type ResultItem } from "@/features/interview/result";
import { cn } from "@/lib/cn";
import { ScoreRing } from "../ScoreRing/ScoreRing";
import styles from "./ScoreCard.module.css";

/** 답변 시간 막대가 가득 차는 길이(초) */
const FULL_SECONDS = 180;

export function ScoreCard({ item }: { item: ResultItem }) {
  const rating = rateScore(item.score);
  const time = rateTime(item.seconds);
  return (
    <section className={styles.card} aria-label="문항 점수">
      <div className={styles.total}>
        <ScoreRing score={item.score} />
        <div>
          <p className={styles.totalName}>이 문항 종합 점수</p>
          <p className={cn(styles.rating, styles[rating.tone])}>{rating.label}</p>
        </div>
      </div>
      <Row icon="check" name="답변 정확도" value={item.accuracy} unit="/ 100" percent={item.accuracy} tone={rateScore(item.accuracy).tone} note={item.accuracyNote} />
      <Row icon="eye" name="시선 처리" value={item.gaze} unit="/ 100" percent={item.gaze} tone={rateScore(item.gaze).tone} note={item.gazeNote} />
      <Row icon="clock" name="답변 시간" value={duration(item.seconds)} unit={time.label} percent={Math.min(100, (item.seconds / FULL_SECONDS) * 100)} tone={time.tone} note={timeNote(item.seconds)} />
    </section>
  );
}

type RowProps = { icon: IconName; name: string; value: ReactNode; unit: string; percent: number; tone: Rating["tone"]; note: string };

function Row({ icon, name, value, unit, percent, tone, note }: RowProps) {
  return (
    <div className={styles.row}>
      <p className={styles.top}>
        <Icon name={icon} size={16} />
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

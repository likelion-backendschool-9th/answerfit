import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon/Icon";
import { duration, rateScore, rateTime, summarize, type Rating, type ResultItem } from "@/features/interview/result";
import { cn } from "@/lib/cn";
import { RatingBadge } from "../RatingBadge/RatingBadge";
import { SectionLabel } from "../SectionLabel/SectionLabel";
import styles from "./GlanceCards.module.css";

const TIME_ZONES = [
  { label: "빠름 · ~1:00", key: "빠름" },
  { label: "준수 · 1:00~2:30", key: "준수" },
  { label: "느림 · 2:30~", key: "느림" },
];

export function GlanceCards({ items }: { items: ResultItem[] }) {
  const { score, gaze, seconds } = summarize(items);
  const time = rateTime(seconds);
  return (
    <section className={styles.glance} aria-labelledby="glance-title">
      <div className={styles.head}>
        <SectionLabel number="02" id="glance-title">
          한눈에 요약
        </SectionLabel>
        <p className={styles.criteria}>점수 기준&nbsp; 80 이상 우수 · 60~79 준수 · 60 미만 노력 필요</p>
      </div>
      <div className={styles.grid}>
        <Card icon="message" label="답변 평균 점수" rating={rateScore(score)} value={score} unit="/ 100" note={`${items.length}개 문항 평균`}>
          <Bar percent={score} tone={rateScore(score).tone} />
        </Card>
        <Card icon="eye" label="시선 처리 평균 점수" rating={rateScore(gaze)} value={gaze} unit="/ 100" note="정면을 본 시간 비율">
          <Bar percent={gaze} tone={rateScore(gaze).tone} />
        </Card>
        <Card icon="clock" label="답변 평균 시간" rating={time} value={duration(seconds)} unit="/ 문항">
          <div className={styles.zones}>
            {TIME_ZONES.map(({ label, key }) => (
              <span key={key} className={cn(styles.zone, key === time.label && styles[time.tone])}>
                <span className={styles.zoneBar} />
                {label}
              </span>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}

type CardProps = { icon: IconName; label: string; rating: Rating; value: ReactNode; unit: string; note?: string; children: ReactNode };

function Card({ icon, label, rating, value, unit, note, children }: CardProps) {
  return (
    <div className={styles.card}>
      <p className={styles.top}>
        <span className={styles.icon}>
          <Icon name={icon} size={20} />
        </span>
        <span className={styles.label}>{label}</span>
        <RatingBadge rating={rating} />
      </p>
      <p className={styles.number}>
        <span className={styles.value}>{value}</span> <span className={styles.unit}>{unit}</span>
      </p>
      {children}
      {note && <p className={styles.note}>{note}</p>}
    </div>
  );
}

function Bar({ percent, tone }: { percent: number; tone: Rating["tone"] }) {
  return (
    <span className={styles.track}>
      <span className={cn(styles.fill, styles[tone])} style={{ width: `${percent}%` }} />
    </span>
  );
}

import Link from "next/link";
import { Icon } from "@/components/ui/Icon/Icon";
import { PERIODS, PREVIOUS_LABEL, RECORD_LABEL, recordsHref, readRecordQuery, type Period } from "@/features/interview/records";
import type { RecordType } from "@/features/interview/types";
import { cn } from "@/lib/cn";
import styles from "./TypeRings.module.css";

type Stat = { type: RecordType; score: number | null; count: number; change: number | null };

const RADIUS = 29;
const AROUND = 2 * Math.PI * RADIUS;

export function TypeRings({ stats, period }: { stats: Stat[]; period: Period }) {
  return (
    <ul className={styles.list}>
      {stats.map(({ type, score, count, change }) => (
        <li key={type} className={styles.item}>
          <div className={styles.ring}>
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <circle className={styles.track} cx="32" cy="32" r={RADIUS} />
              {score !== null && <circle className={styles.value} cx="32" cy="32" r={RADIUS} strokeDasharray={`${(AROUND * score) / 100} ${AROUND}`} />}
            </svg>
            <span className={styles.score}>{score ?? "–"}</span>
          </div>
          <div className={styles.text}>
            <p className={styles.name}>{RECORD_LABEL[type]}</p>
            {score === null ? (
              <>
                <p>아직 기록이 없어요</p>
                <Link href={recordsHref(readRecordQuery({}), { type })} className={styles.link}>
                  {RECORD_LABEL[type]} 기록 보기 <Icon name="chevron" size={14} />
                </Link>
              </>
            ) : (
              <>
                <p>{change === null ? "비교할 기록이 없어요" : <Change value={change} label={PREVIOUS_LABEL[period] ?? ""} />}</p>
                <p>
                  {PERIODS[period]} {count}회 응시
                </p>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Change({ value, label }: { value: number; label: string }) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "±";
  return (
    <>
      <span className={cn(value > 0 && styles.up, value < 0 && styles.down)}>
        {sign}
        {Math.abs(value)}점
      </span>{" "}
      {label} 대비
    </>
  );
}

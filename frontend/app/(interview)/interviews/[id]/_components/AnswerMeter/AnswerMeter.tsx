import { clock, REAL_LIMIT_SECONDS, type RoomState } from "@/features/interview/room";
import { cn } from "@/lib/cn";
import styles from "./AnswerMeter.module.css";

export const LEVEL_BARS = 24;

/** 답변 상태, 시간, 소리 크기 */
export function AnswerMeter({ state, levels }: { state: RoomState; levels: number[] }) {
  const answering = state.phase === "answering";
  const started = state.answerSeconds > 0;
  const label = answering ? "답변을 듣고 있어요" : started ? "다시 들은 뒤 이어서 녹음해요" : "질문이 끝나면 바로 녹음이 시작돼요";
  return (
    <div>
      <div className={styles.top}>
        <p className={styles.label}>
          <span className={cn(styles.dot, answering && styles.live)} /> {label}
        </p>
        <p className={cn(styles.time, !answering && styles.idle)} aria-label="답변 시간">
          {clock(state.answerSeconds)}
          {state.mode === "real" && <span className={styles.limit}> / {clock(REAL_LIMIT_SECONDS)}</span>}
        </p>
      </div>
      <div className={styles.bars} aria-hidden="true">
        {Array.from({ length: LEVEL_BARS }, (_, i) => {
          const level = answering ? levels[i] : undefined;
          return <span key={i} className={cn(styles.bar, level !== undefined && styles.on)} style={{ height: `${Math.round(4 + (level ?? 0) * 26)}px` }} />;
        })}
      </div>
    </div>
  );
}

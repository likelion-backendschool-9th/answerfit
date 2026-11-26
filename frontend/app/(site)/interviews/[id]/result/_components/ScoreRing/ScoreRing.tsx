import { cn } from "@/lib/cn";
import styles from "./ScoreRing.module.css";

const RADIUS = 42;
const LENGTH = 2 * Math.PI * RADIUS;

/** 100점 만점 원형 점수. large는 면접 전체 점수에 쓴다 */
export function ScoreRing({ score, large = false }: { score: number; large?: boolean }) {
  const percent = Math.min(100, Math.max(0, score)) / 100;
  return (
    <div className={cn(styles.ring, large && styles.large)} role="img" aria-label={`100점 중 ${score}점`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className={styles.track} cx="50" cy="50" r={RADIUS} />
        <circle className={styles.fill} cx="50" cy="50" r={RADIUS} strokeDasharray={`${LENGTH * percent} ${LENGTH}`} />
      </svg>
      <span className={styles.text} aria-hidden="true">
        <span className={styles.score}>{score}</span>
        {large && <span className={styles.unit}>/ 100</span>}
      </span>
    </div>
  );
}

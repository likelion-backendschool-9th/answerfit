import styles from "./StatCards.module.css";

type Props = { count: number; score: number | null; streak: number; liked: number };

export function StatCards({ count, score, streak, liked }: Props) {
  return (
    <dl className={styles.cards}>
      <Card label="이번 달 응시 횟수" value={count} unit="회" />
      <Card label="이번 달 평균 점수" value={score ?? "–"} unit="/ 100" />
      <Card label="연속 학습" value={streak} unit="일째" />
      <Card label="좋아요한 질문" value={liked} unit="개" />
    </dl>
  );
}

function Card({ label, value, unit }: { label: string; value: number | string; unit: string }) {
  return (
    <div className={styles.card}>
      <dt className={styles.label}>{label}</dt>
      <dd className={styles.body}>
        <span className={styles.value}>{value}</span> <span className={styles.unit}>{unit}</span>
      </dd>
    </div>
  );
}

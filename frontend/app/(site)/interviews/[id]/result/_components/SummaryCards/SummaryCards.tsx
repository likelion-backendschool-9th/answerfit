import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon/Icon";
import { bestItem, duration, itemsToReview, rateScore, rateTime, summarize, type Rating, type ResultItem } from "@/features/interview/result";
import { RatingBadge } from "../RatingBadge/RatingBadge";
import styles from "./SummaryCards.module.css";

export function SummaryCards({ items, onSelect }: { items: ResultItem[]; onSelect: (id: string) => void }) {
  const { score, gaze, seconds } = summarize(items);
  const review = itemsToReview(items);
  const best = bestItem(items);
  return (
    <div className={styles.grid}>
      <section className={styles.glance} aria-labelledby="glance-title">
        <h2 id="glance-title" className={styles.title}>
          한눈에 보기
        </h2>
        <dl className={styles.numbers}>
          <Number label="답변 평균 점수" value={score} unit="/ 100" rating={rateScore(score)} note={`답변 ${items.length}개 평균`} />
          <Number label="시선 처리 평균 점수" value={gaze} unit="/ 100" rating={rateScore(gaze)} note="정면을 본 시간 비율" />
          <Number label="답변 평균 시간" value={duration(seconds)} unit="/ 답변" rating={rateTime(seconds)} note="1분~2분 30초 권장" />
        </dl>
        <p className={styles.criteria}>점수 기준&nbsp; 80 이상 우수 · 60~79 준수 · 60 미만 노력 필요</p>
      </section>
      <section className={styles.review} aria-labelledby="review-title">
        <h2 id="review-title" className={styles.title}>
          먼저 다시 볼 질문
        </h2>
        {review.length === 0 && <p className={styles.none}>모든 답변이 우수해요.</p>}
        <ul className={styles.list}>
          {review.map(({ id, label, reviewNote, score: value }) => (
            <li key={id}>
              <button type="button" className={styles.row} onClick={() => onSelect(id)}>
                <span className={styles.label}>{label}</span>
                <span className={styles.note}>{reviewNote}</span>
                <span className={styles.score}>{value}</span>
                <Icon name="chevron" size={16} />
              </button>
            </li>
          ))}
        </ul>
        {best && (
          <p className={styles.best}>
            <span className={styles.ok}>
              <Icon name="check" size={16} />
            </span>
            <span className={styles.bestLabel}>가장 잘한 답변</span>
            <button type="button" className={styles.bestLink} onClick={() => onSelect(best.id)}>
              {best.label} {best.title} · {best.score}점
            </button>
          </p>
        )}
      </section>
    </div>
  );
}

function Number({ label, value, unit, rating, note }: { label: string; value: ReactNode; unit: string; rating: Rating; note: string }) {
  return (
    <div className={styles.number}>
      <dt className={styles.numberLabel}>{label}</dt>
      <dd className={styles.numberBody}>
        <span className={styles.value}>{value}</span> <span className={styles.unit}>{unit}</span>
        <span className={styles.rating}>
          <RatingBadge rating={rating} /> {note}
        </span>
      </dd>
    </div>
  );
}

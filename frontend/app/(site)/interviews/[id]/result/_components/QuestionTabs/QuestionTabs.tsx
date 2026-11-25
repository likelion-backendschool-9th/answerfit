import { Icon } from "@/components/ui/Icon/Icon";
import type { ResultItem } from "@/features/interview/result";
import { cn } from "@/lib/cn";
import styles from "./QuestionTabs.module.css";

type Props = { items: ResultItem[]; currentId: string; onSelect: (id: string) => void };

export function QuestionTabs({ items, currentId, onSelect }: Props) {
  const index = items.findIndex(({ id }) => id === currentId);
  const previous = items[index - 1];
  const next = items[index + 1];
  return (
    <>
      <div className={styles.head}>
        <h2 id="detail-title" className={styles.title}>
          질문별 상세
        </h2>
        <p className={styles.guide}>질문을 누르면 영상과 피드백이 함께 바뀌어요</p>
        <div className={styles.pager}>
          <button type="button" className={styles.arrow} aria-label="이전 질문" disabled={!previous} onClick={() => previous && onSelect(previous.id)}>
            <Icon name="back" size={20} />
          </button>
          <span className={styles.page}>
            {index + 1} / {items.length}
          </span>
          <button type="button" className={styles.arrow} aria-label="다음 질문" disabled={!next} onClick={() => next && onSelect(next.id)}>
            <Icon name="arrow" size={20} />
          </button>
        </div>
      </div>
      <ul className={styles.tabs}>
        {items.map(({ id, label, title, score }) => (
          <li key={id}>
            <button type="button" className={cn(styles.tab, id === currentId && styles.current)} aria-pressed={id === currentId} onClick={() => onSelect(id)}>
              <span className={styles.top}>
                <span className={styles.label}>{label}</span>
                <span className={cn(styles.score, score >= 80 && styles.good)}>{score}</span>
              </span>
              <span className={styles.name}>{title}</span>
              <span className={styles.track}>
                <span className={styles.fill} style={{ width: `${score}%` }} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

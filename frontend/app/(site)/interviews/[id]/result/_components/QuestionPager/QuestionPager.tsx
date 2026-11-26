import { Icon } from "@/components/ui/Icon/Icon";
import { itemNumber, type ResultItem } from "@/features/interview/result";
import styles from "./QuestionPager.module.css";

type Props = { items: ResultItem[]; currentId: string; onSelect: (id: string) => void };

/** 꼬리 질문까지 모든 문항을 01, 02 … 로 고른다 */
export function QuestionPager({ items, currentId, onSelect }: Props) {
  const index = items.findIndex(({ id }) => id === currentId);
  const previous = items[index - 1];
  const next = items[index + 1];
  return (
    <nav className={styles.pager} aria-label="문항 고르기">
      <button type="button" className={styles.arrow} aria-label="이전 문항" disabled={!previous} onClick={() => previous && onSelect(previous.id)}>
        <Icon name="back" size={18} />
      </button>
      <ol className={styles.list}>
        {items.map(({ id, label, title }, i) => (
          <li key={id}>
            <button type="button" className={styles.number} aria-current={id === currentId ? "true" : undefined} aria-label={`${itemNumber(i)} ${label} ${title}`} onClick={() => onSelect(id)}>
              {itemNumber(i)}
            </button>
          </li>
        ))}
      </ol>
      <button type="button" className={styles.arrow} aria-label="다음 문항" disabled={!next} onClick={() => next && onSelect(next.id)}>
        <Icon name="arrow" size={18} />
      </button>
    </nav>
  );
}

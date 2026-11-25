import { Icon } from "@/components/ui/Icon/Icon";
import type { ResultItem } from "@/features/interview/result";
import styles from "./CommentCard.module.css";

export function CommentCard({ item }: { item: ResultItem }) {
  return (
    <section className={styles.card} aria-label="AI 코멘트">
      <h4 className={styles.title}>
        <Icon name="message" size={20} /> AI 코멘트
      </h4>
      <h5 className={styles.label}>총평</h5>
      <p className={styles.comment}>{item.comment}</p>
      <h5 className={styles.label}>심화 학습 키워드</h5>
      <ul className={styles.keywords}>
        {item.keywords.map((keyword) => (
          <li key={keyword} className={styles.keyword}>
            <Icon name="bookmark" size={14} /> {keyword}
          </li>
        ))}
      </ul>
      <div className={styles.tip}>
        <Icon name="bulb" size={20} />
        <div>
          <h5 className={styles.tipTitle}>면접관 팁</h5>
          <p className={styles.tipText}>{item.tip}</p>
        </div>
      </div>
    </section>
  );
}

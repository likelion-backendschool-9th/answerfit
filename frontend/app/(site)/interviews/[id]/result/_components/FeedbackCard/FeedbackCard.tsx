import { Icon } from "@/components/ui/Icon/Icon";
import type { ResultItem } from "@/features/interview/result";
import { cn } from "@/lib/cn";
import styles from "./FeedbackCard.module.css";

export function FeedbackCard({ item }: { item: ResultItem }) {
  return (
    <section aria-labelledby="feedback-title">
      <h4 id="feedback-title" className={styles.heading}>
        <Icon name="bulb" size={18} /> AI 피드백
      </h4>
      <div className={styles.card}>
        <div className={styles.part}>
          <h5 className={styles.label}>총평</h5>
          <p className={styles.comment}>{item.comment}</p>
        </div>
        {item.keywordChecks.length > 0 && (
          <div className={styles.part}>
            <h5 className={styles.label}>핵심 키워드 체크</h5>
            <ul className={styles.chips}>
              {item.keywordChecks.map(({ keyword, said }) => (
                <li key={keyword} className={cn(styles.check, said ? styles.said : styles.missed)}>
                  <Icon name={said ? "tick" : "close"} size={14} />
                  {keyword}
                  <span className={styles.hidden}>{said ? " (말함)" : " (놓침)"}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className={styles.part}>
          <h5 className={styles.label}>심화 학습 키워드</h5>
          <ul className={styles.chips}>
            {item.keywords.map((keyword) => (
              <li key={keyword} className={styles.keyword}>
                <Icon name="bookmark" size={14} /> {keyword}
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.part}>
          <h5 className={cn(styles.label, styles.tipLabel)}>
            <Icon name="bulb" size={16} /> 면접관 팁
          </h5>
          <p className={styles.comment}>{item.tip}</p>
        </div>
      </div>
    </section>
  );
}

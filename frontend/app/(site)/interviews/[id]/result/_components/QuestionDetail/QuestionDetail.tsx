import { Icon } from "@/components/ui/Icon/Icon";
import type { ResultItem } from "@/features/interview/result";
import { CommentCard } from "../CommentCard/CommentCard";
import { ScoreCard } from "../ScoreCard/ScoreCard";
import { VideoPlayer } from "../VideoPlayer/VideoPlayer";
import styles from "./QuestionDetail.module.css";

export function QuestionDetail({ interviewId, item }: { interviewId: string; item: ResultItem }) {
  return (
    <article className={styles.card} aria-label={`${item.label} 상세`}>
      <p className={styles.category}>
        <span className={styles.label}>{item.label}</span> {item.category}
      </p>
      <h3 className={styles.question}>{item.text}</h3>
      <div className={styles.grid}>
        <div className={styles.column}>
          <VideoPlayer interviewId={interviewId} item={item} />
          <section className={styles.answer}>
            <div className={styles.answerTop}>
              <h4 className={styles.answerTitle}>
                <Icon name="mic" size={16} /> 내 답변
              </h4>
              <p className={styles.answerNote}>음성 인식 결과 · 일부 단어가 다를 수 있어요</p>
            </div>
            <p className={styles.transcript}>{item.transcript}</p>
          </section>
        </div>
        <div className={styles.column}>
          <ScoreCard item={item} />
          <CommentCard item={item} />
        </div>
      </div>
    </article>
  );
}

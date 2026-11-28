import { Icon } from "@/components/ui/Icon/Icon";
import styles from "./PendingCard.module.css";

type Props = { rejected?: boolean; reason?: string | null };

export function PendingCard({ rejected = false, reason }: Props) {
  return (
    <section className={styles.card} aria-label={rejected ? "반려 안내" : "승인 진행 상황"}>
      <p className={styles.title}>
        <Icon name={rejected ? "alert" : "clock"} size={20} /> {rejected ? "질문이 반려되었어요" : "관리자 확인을 기다리고 있어요"}
      </p>
      {rejected && <p className={styles.reason}><strong>반려 사유</strong><br />{reason?.trim() || "등록된 반려 사유가 없어요."}</p>}
      <p className={styles.description}>
        {rejected
          ? "질문을 수정하면 같은 질문으로 다시 제출되고 관리자 확인을 받아요. 승인되면 아카이브에 공개되며 이후에는 수정 · 삭제할 수 없어요."
          : "승인 전까지는 수정 · 삭제할 수 있어요. 승인되면 질문이 아카이브에 바로 공개되고 AI가 모범답안을 만들어요. 승인 후에는 수정 · 삭제할 수 없어요."}
      </p>
      <ol className={styles.steps}>
        <li className={styles.done}>
          <Icon name="check" size={18} /> 등록
        </li>
        <li className={styles.doing} aria-current="step">
          <Icon name={rejected ? "alert" : "spinner"} size={18} /> {rejected ? "관리자 반려" : "관리자 확인"}
        </li>
        <li className={styles.waiting}>
          <Icon name="circle" size={18} /> {rejected ? "수정 후 재제출" : "아카이브 공개"}
        </li>
        <li className={styles.waiting}>
          <Icon name="circle" size={18} /> {rejected ? "관리자 재검토" : "AI 모범답안"}
        </li>
      </ol>
    </section>
  );
}

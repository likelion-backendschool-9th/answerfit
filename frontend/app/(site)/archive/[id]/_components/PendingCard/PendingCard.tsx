import { Icon } from "@/components/ui/Icon/Icon";
import styles from "./PendingCard.module.css";

export function PendingCard() {
  return (
    <section className={styles.card} aria-label="승인 진행 상황">
      <p className={styles.title}>
        <Icon name="clock" size={20} /> 관리자 확인을 기다리고 있어요
      </p>
      <p className={styles.description}>승인 전까지는 자유롭게 수정 · 삭제할 수 있어요. 승인되면 AI가 모범답안을 만들고, 그 뒤에는 수정 · 삭제할 수 없어요.</p>
      <ol className={styles.steps}>
        <li className={styles.done}>
          <Icon name="check" size={18} /> 등록
        </li>
        <li className={styles.doing} aria-current="step">
          <Icon name="spinner" size={18} /> 관리자 확인
        </li>
        <li className={styles.waiting}>
          <Icon name="circle" size={18} /> AI 모범답안
        </li>
        <li className={styles.waiting}>
          <Icon name="circle" size={18} /> 아카이브 반영
        </li>
      </ol>
    </section>
  );
}

import Link from "next/link";
import { PATHS } from "@/app/_lib/paths";
import { Icon } from "@/components/ui/Icon/Icon";
import { PendingActions } from "@/features/question/components/PendingActions/PendingActions";
import type { ArchiveQuestion } from "@/features/question/types";
import { cn } from "@/lib/cn";
import styles from "./MyQuestionCard.module.css";

const dots = (date: string) => date.replaceAll("-", ".");

export function MyQuestionCard({ question: { id, category, text, status, likes, createdOn, approvedOn } }: { question: ArchiveQuestion }) {
  const pending = status === "pending";
  return (
    <article className={cn(styles.card, pending && styles.pending)}>
      <div className={styles.text}>
        <p className={styles.top}>
          <span className={styles.category}>{category}</span>
          <span className={cn(styles.badge, pending ? styles.waiting : styles.approved)}>{pending ? "승인 대기" : "승인됨"}</span>
        </p>
        <Link href={PATHS.question(id)} className={styles.question}>
          {text}
        </Link>
        <p className={styles.date}>
          {createdOn && `${dots(createdOn)} 등록`}
          {approvedOn && ` · ${dots(approvedOn).slice(5)} 승인`}
        </p>
      </div>
      {pending ? (
        <div className={styles.actions}>
          <PendingActions id={id} category={category} text={text} next={PATHS.myQuestions} />
        </div>
      ) : (
        <div className={styles.state}>
          <span className={styles.likes}>
            <Icon name="heart" size={16} /> {likes}
          </span>
          <span className={styles.locked}>
            <Icon name="lock" size={16} /> 수정 불가
          </span>
          <Icon name="chevron" size={16} />
        </div>
      )}
    </article>
  );
}

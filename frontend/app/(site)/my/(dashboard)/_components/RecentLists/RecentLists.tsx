import Link from "next/link";
import { PATHS } from "@/app/_lib/paths";
import { Icon } from "@/components/ui/Icon/Icon";
import { MODE_SHORT, RECORD_LABEL, type InterviewRecord } from "@/features/interview/records";
import type { ArchiveQuestion } from "@/features/question/types";
import { cn } from "@/lib/cn";
import styles from "./RecentLists.module.css";

export function RecentLists({ records, liked }: { records: InterviewRecord[]; liked: ArchiveQuestion[] }) {
  return (
    <div className={styles.grid}>
      <section className={styles.card} aria-labelledby="recent-title">
        <Top id="recent-title" title="최근 본 모의 면접" href={PATHS.myInterviews} />
        {records.length === 0 && <p className={styles.empty}>아직 본 면접이 없어요.</p>}
        <ul>
          {records.map(({ id, title, type, mode, count, score }) => (
            <li key={id}>
              <Link href={PATHS.interviewResult(id)} className={styles.row}>
                <span className={styles.text}>
                  <span className={styles.title}>{title}</span>
                  <span className={styles.meta}>
                    {RECORD_LABEL[type]} · {MODE_SHORT[mode]} · {count}문항
                  </span>
                </span>
                <span className={cn(styles.score, score >= 80 && styles.good)}>{score}</span>
                <Icon name="chevron" size={16} />
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className={styles.card} aria-labelledby="liked-title">
        <Top id="liked-title" title="좋아요한 면접 질문" href={PATHS.myLikes} />
        {liked.length === 0 && <p className={styles.empty}>아직 좋아요한 질문이 없어요.</p>}
        <ul>
          {liked.map(({ id, category, text }) => (
            <li key={id}>
              <Link href={PATHS.question(id)} className={styles.row}>
                <span className={styles.text}>
                  <span className={styles.category}>{category}</span>
                  <span className={styles.title}>{text}</span>
                </span>
                <Icon name="chevron" size={16} />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Top({ id, title, href }: { id: string; title: string; href: string }) {
  return (
    <div className={styles.top}>
      <h2 id={id} className={styles.heading}>
        {title}
      </h2>
      <Link href={href} className={styles.all}>
        전체 보기 <Icon name="chevron" size={14} />
      </Link>
    </div>
  );
}

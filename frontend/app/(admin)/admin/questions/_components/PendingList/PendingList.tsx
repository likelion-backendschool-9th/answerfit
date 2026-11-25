import Link from "next/link";
import { Icon } from "@/components/ui/Icon/Icon";
import { bankHref, shortTime } from "@/features/admin/rules";
import type { PendingQuestion } from "@/features/admin/types";
import { daysUntil } from "@/features/interview/result";
import { todayInSeoul } from "@/features/interview/setup";
import { PendingButtons } from "../PendingButtons/PendingButtons";
import styles from "./PendingList.module.css";

const ALL = { kind: null, category: null, page: 1 };

export function PendingList({ questions, today }: { questions: PendingQuestion[]; today: string }) {
  const oldest = questions.reduce((days, { createdAt }) => Math.max(days, daysUntil(today, todayInSeoul(new Date(createdAt)))), 0);
  return (
    <>
      <p className={styles.notice}>
        <Icon name="info" size={18} /> 승인하면 AI가 모범답안과 핵심 키워드를 만들고, 문제 은행과 질문 아카이브에 바로 반영돼요. 승인 뒤에는 등록한 사용자가 수정 · 삭제할 수 없어요.
      </p>
      <ul className={styles.list}>
        {questions.map(({ id, code, category, text, nickname, email, createdAt, similar }) => (
          <li key={id} className={styles.card}>
            <div className={styles.body}>
              <p className={styles.meta}>
                <span className={styles.code}>{code}</span>
                <span>
                  <span className={styles.cs}>CS</span> <span className={styles.category}>{category}</span>
                </span>
                <span className={styles.who}>
                  <Icon name="person" size={14} /> {nickname} · {email}
                </span>
                <span>{shortTime(createdAt)} 등록</span>
              </p>
              <p className={styles.text}>{text}</p>
              {similar && (
                <Link href={bankHref({ ...ALL, keyword: similar.code })} className={styles.similar}>
                  <Icon name="alert" size={16} />
                  <span className={styles.similarLabel}>비슷한 질문 1개</span>
                  <span className={styles.code}>{similar.code}</span>
                  <span className={styles.similarText}>{similar.text}</span>
                  <Icon name="chevron" size={14} />
                </Link>
              )}
            </div>
            <PendingButtons id={id} />
          </li>
        ))}
      </ul>
      <p className={styles.footer}>
        <Icon name="tick" size={16} /> {questions.length > 0 ? `승인 대기 ${questions.length}개 · 가장 오래된 요청 ${oldest > 0 ? `${oldest}일 전` : "오늘"}` : "승인을 기다리는 질문이 없어요."}
      </p>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { PATHS } from "@/app/_lib/paths";
import { getMyQuestions } from "@/features/question/api";
import { RegisterButton } from "@/features/question/components/RegisterButton/RegisterButton";
import type { ArchiveQuestion } from "@/features/question/types";
import { requireMember } from "@/features/session/guard";
import { PageHeading } from "../_components/PageHeading/PageHeading";
import { MyQuestionCard } from "./_components/MyQuestionCard/MyQuestionCard";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "내가 올린 질문" };

type Props = { searchParams: Promise<{ status?: string | string[] }> };
const TABS: { status: ArchiveQuestion["status"] | null; label: string }[] = [
  { status: null, label: "전체" },
  { status: "pending", label: "승인 대기" },
  { status: "rejected", label: "반려" },
  { status: "approved", label: "승인됨" },
];

export default async function MyQuestionsPage({ searchParams }: Props) {
  const { status: raw } = await searchParams;
  const status = raw === "pending" || raw === "approved" || raw === "rejected" ? raw : null;
  await requireMember(PATHS.myQuestions);
  const mine = (await getMyQuestions()).sort((a, b) => (b.createdOn ?? "").localeCompare(a.createdOn ?? ""));
  const of = (one: ArchiveQuestion["status"] | null) => (one ? mine.filter((question) => question.status === one) : mine);
  const items = of(status);
  return (
    <>
      <PageHeading title="내가 올린 질문" description="승인되면 AI가 모범답안을 만들어 아카이브에 공개해요. 승인 전에만 수정 · 삭제할 수 있어요.">
        <RegisterButton variant="outline" />
      </PageHeading>
      <nav className={styles.tabs} aria-label="승인 상태">
        {TABS.map(({ status: one, label }) => (
          <Link key={label} href={one ? `${PATHS.myQuestions}?status=${one}` : PATHS.myQuestions} className={styles.tab} aria-current={one === status ? "page" : undefined}>
            {label} <span className={styles.count}>{of(one).length}</span>
          </Link>
        ))}
      </nav>
      {items.length === 0 && <p className={styles.empty}>아직 질문이 없어요.</p>}
      <ul className={styles.list}>
        {items.map((question) => (
          <li key={question.id}>
            <MyQuestionCard question={question} />
          </li>
        ))}
      </ul>
    </>
  );
}

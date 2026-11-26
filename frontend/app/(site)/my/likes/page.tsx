import type { Metadata } from "next";
import { PATHS } from "@/app/_lib/paths";
import { FilterChips } from "@/components/ui/FilterChips/FilterChips";
import { getLikedAnswers, getQuestions } from "@/features/question/api";
import { requireMember } from "@/features/session/guard";
import { PageHeading } from "../_components/PageHeading/PageHeading";
import { LikedList, type LikedItem } from "./_components/LikedList/LikedList";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "좋아요한 질문" };

type Props = { searchParams: Promise<{ category?: string | string[] }> };
const FROM_INTERVIEW = "면접에서 받은 질문";
const PERSONALITY = "인성 질문";

export default async function LikesPage({ searchParams }: Props) {
  const { category: raw } = await searchParams;
  const selected = typeof raw === "string" ? raw : null;
  await requireMember(PATHS.myLikes);
  const [questions, answers] = await Promise.all([getQuestions(), getLikedAnswers()]);
  const items: LikedItem[] = [
    ...answers.map(({ id, interviewId, text, date, typeLabel, score }) => ({ id, source: "interview" as const, category: FROM_INTERVIEW, text, meta: `${date} ${typeLabel} · 내 점수 ${score}`, href: PATHS.interviewResult(interviewId) })),
    ...questions.filter(({ liked }) => liked).map(({ id, kind, category, text, likes }) => ({ id, source: "archive" as const, category: kind === "personality" ? PERSONALITY : category, text, meta: `좋아요 ${likes}`, href: PATHS.question(id) })),
  ];
  const categories = [...new Set(items.map(({ category }) => category))];
  const shown = selected && categories.includes(selected) ? items.filter(({ category }) => category === selected) : items;
  const href = (category: string | null) => (category ? `${PATHS.myLikes}?category=${encodeURIComponent(category)}` : PATHS.myLikes);
  const chips = [null, ...categories].map((category) => ({
    label: category ?? "전체",
    count: category ? items.filter((item) => item.category === category).length : items.length,
    href: href(category),
    current: category === (shown === items ? null : selected),
  }));
  return (
    <>
      <PageHeading title="좋아요한 질문" description={`면접 결과와 질문 아카이브에서 좋아요한 질문 ${items.length}개예요. 하트를 누르면 좋아요가 풀리고, 새로고침하면 목록에서 빠져요.`} />
      <div className={styles.chips}>
        <FilterChips label="분야" chips={chips} />
      </div>
      <LikedList key={selected ?? "all"} items={shown} />
    </>
  );
}

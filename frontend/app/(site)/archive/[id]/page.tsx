import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TopBar } from "@/app/_components/TopBar/TopBar";
import { PATHS } from "@/app/_lib/paths";
import { getQuestions } from "@/features/question/api";
import { PendingActions } from "@/features/question/components/PendingActions/PendingActions";
import { archiveHref, KIND_LABEL, neighbors, readQuery } from "@/features/question/rules";
import { requireMember } from "@/features/session/guard";
import { LikeButton } from "../_components/LikeButton/LikeButton";
import { ModelAnswer } from "./_components/ModelAnswer/ModelAnswer";
import { Neighbors } from "./_components/Neighbors/Neighbors";
import { PendingCard } from "./_components/PendingCard/PendingCard";
import { ReportButton } from "./_components/ReportButton/ReportButton";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "질문 상세" };

type Props = { params: Promise<{ id: string }> };

export default function QuestionPage({ params }: Props) {
  return (
    <>
      <TopBar current={PATHS.archive} />
      <Suspense>
        <Question params={params} />
      </Suspense>
    </>
  );
}

async function Question({ params }: Props) {
  const id = decodeURIComponent((await params).id);
  await requireMember(PATHS.question(id));
  const questions = await getQuestions();
  const question = questions.find((one) => one.id === id);
  if (!question) notFound();
  const { kind, category, text, mine, status, likes, liked, reported, answer } = question;
  const query = { ...readQuery({}), kind };
  const pending = status === "pending";
  // 승인 전인 내 질문은 앞뒤 질문에 끼지 않는다
  const { previous, next } = neighbors(
    questions.filter((one) => one.status === "approved" || one.id === id),
    question,
  );
  return (
    <article className={styles.content}>
      <nav aria-label="현재 위치" className={styles.crumb}>
        <Link href={PATHS.archive}>질문 아카이브</Link> › <Link href={archiveHref(query)}>{KIND_LABEL[kind]}</Link> › <Link href={archiveHref(query, { category })}>{category}</Link>
      </nav>
      {pending ? (
        <p className={styles.badge}>승인 대기</p>
      ) : (
        <p className={styles.category}>
          {KIND_LABEL[kind]} · {category}
        </p>
      )}
      <h1 className={styles.title}>{text}</h1>
      <div className={styles.actions}>
        {pending && mine ? (
          <PendingActions id={id} category={category} text={text} next={PATHS.archive} />
        ) : (
          <>
            <LikeButton id={id} liked={liked} likes={likes} wide />
            {!mine && <ReportButton id={id} label={`${KIND_LABEL[kind]} · ${category}`} text={text} reported={reported} />}
          </>
        )}
      </div>
      {pending && <PendingCard />}
      <ModelAnswer answer={answer} pending={pending} />
      {!pending && <Neighbors previous={previous} next={next} />}
    </article>
  );
}

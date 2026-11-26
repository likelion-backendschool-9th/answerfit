import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TopBar } from "@/app/_components/TopBar/TopBar";
import { PATHS } from "@/app/_lib/paths";
import { getQuestionDetail } from "@/features/question/api";
import { PendingActions } from "@/features/question/components/PendingActions/PendingActions";
import { archiveHref, KIND_LABEL, readQuery } from "@/features/question/rules";
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
  const { id } = await params;
  await requireMember(PATHS.question(id));
  const detail = await getQuestionDetail(id);
  if (!detail) notFound();
  const { question, previous, next } = detail;
  const { kind, category, text, mine, status, likes, liked, reported, answer } = question;
  const query = { ...readQuery({}), kind };
  const pending = status === "pending";
  const rejected = status === "rejected";
  const approved = status === "approved";
  const unapproved = pending || rejected;
  const canEdit = question.canEdit ?? (mine && unapproved);
  const canDelete = question.canDelete ?? (mine && unapproved);
  const canReport = question.canReport ?? (approved && !mine && !reported);
  const categoryId = question.categoryId === undefined ? category : question.categoryId;
  const hasCategory = categoryId !== null && Boolean(category);
  const label = hasCategory ? `${KIND_LABEL[kind]} · ${category}` : KIND_LABEL[kind];
  return (
    <article className={styles.content}>
      <nav aria-label="현재 위치" className={styles.crumb}>
        <Link href={PATHS.archive}>질문 아카이브</Link> › <Link href={archiveHref(query)}>{KIND_LABEL[kind]}</Link>
        {hasCategory && <> › <Link href={archiveHref(query, { category: categoryId })}>{category}</Link></>}
      </nav>
      {unapproved ? (
        <p className={styles.badge}>{rejected ? "반려됨" : "승인 대기"}</p>
      ) : (
        <p className={styles.category}>{label}</p>
      )}
      <h1 className={styles.title}>{text}</h1>
      <div className={styles.actions}>
        {(canEdit || canDelete) && (
          <PendingActions id={id} category={category} text={text} next={PATHS.archive} canEdit={canEdit} canDelete={canDelete} />
        )}
        {approved && (
          <>
            <LikeButton id={id} liked={liked} likes={likes} wide />
            {(canReport || (reported && !mine)) && <ReportButton id={id} label={label} text={text} reported={reported} />}
          </>
        )}
      </div>
      {unapproved && <PendingCard rejected={rejected} reason={question.rejectionReason} />}
      <ModelAnswer answer={answer} pending={pending} rejected={rejected} answerStatus={question.answerStatus} />
      {approved && <Neighbors previous={previous} next={next} />}
    </article>
  );
}

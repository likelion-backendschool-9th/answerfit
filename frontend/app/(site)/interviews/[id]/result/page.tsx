import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { TopBar } from "@/app/_components/TopBar/TopBar";
import { PATHS } from "@/app/_lib/paths";
import { getResult } from "@/features/interview/api";
import { todayInSeoul } from "@/features/interview/setup";
import { getLikedAnswers } from "@/features/question/api";
import { requireMember } from "@/features/session/guard";
import { ApiNotConnectedError } from "@/lib/backend-http";
import { PrintReport } from "./_components/PrintReport/PrintReport";
import { ResultView } from "./_components/ResultView/ResultView";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "면접 결과" };

type Props = { params: Promise<{ id: string }> };

export default function ResultPage({ params }: Props) {
  return (
    <>
      <div className={styles.screen}>
        <TopBar current={PATHS.newInterview} />
      </div>
      <Suspense>
        <Result params={params} />
      </Suspense>
    </>
  );
}

/** 좋아요 목록 API가 아직 없으면 좋아요하지 않은 것으로 보여 준다 */
async function likedAnswerIds() {
  try {
    return (await getLikedAnswers()).map(({ id }) => id);
  } catch (error) {
    if (error instanceof ApiNotConnectedError) return [];
    throw error;
  }
}

async function Result({ params }: Props) {
  const { id } = await params;
  await requireMember(PATHS.interviewResult(id));
  const found = await getResult(id);
  if (!found) notFound();
  if (found.state === "inProgress") redirect(PATHS.interview(id));
  if (found.state === "analyzing") redirect(PATHS.interviewAnalyzing(id));
  if (found.result.items.length === 0) notFound();
  const likedIds = await likedAnswerIds();
  return (
    <>
      <div className={styles.screen}>
        <ResultView key={id} result={found.result} today={todayInSeoul(new Date())} likedIds={likedIds} />
      </div>
      <PrintReport result={found.result} />
    </>
  );
}

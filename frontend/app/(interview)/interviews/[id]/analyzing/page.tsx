import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { Main } from "@/app/_components/Main/Main";
import { TopBar } from "@/app/_components/TopBar/TopBar";
import { PATHS } from "@/app/_lib/paths";
import { getProgress, getResult } from "@/features/interview/api";
import { requireMember } from "@/features/session/guard";
import { AnalysisProgress } from "./_components/AnalysisProgress/AnalysisProgress";

export const metadata: Metadata = { title: "면접 결과 정리" };

type Props = { params: Promise<{ id: string }> };

/** 푸터가 없는 화면이라 본문을 직접 그린다 */
export default function AnalyzingPage({ params }: Props) {
  return (
    <Main>
      <TopBar current={PATHS.newInterview} />
      <Suspense>
        <Analyzing params={params} />
      </Suspense>
    </Main>
  );
}

async function Analyzing({ params }: Props) {
  const { id } = await params;
  await requireMember(PATHS.interviewAnalyzing(id));
  const result = await getResult(id);
  if (!result) notFound();
  if (result.state === "inProgress") redirect(PATHS.interview(id));
  if (result.state === "done") redirect(PATHS.interviewResult(id));
  const progress = await getProgress(id);
  if (!progress) notFound();
  return <AnalysisProgress id={id} initial={progress} />;
}

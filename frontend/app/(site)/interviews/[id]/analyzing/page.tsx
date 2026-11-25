import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { TopBar } from "@/app/_components/TopBar/TopBar";
import { PATHS } from "@/app/_lib/paths";
import { getProgress, getResult } from "@/features/interview/api";
import { requireMember } from "@/features/session/guard";
import { AnalysisProgress } from "./_components/AnalysisProgress/AnalysisProgress";

export const metadata: Metadata = { title: "면접 결과 정리" };

type Props = { params: Promise<{ id: string }> };

export default function AnalyzingPage({ params }: Props) {
  return (
    <>
      <TopBar current={PATHS.newInterview} />
      <Suspense>
        <Analyzing params={params} />
      </Suspense>
    </>
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

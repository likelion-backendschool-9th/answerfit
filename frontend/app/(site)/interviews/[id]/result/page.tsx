import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { TopBar } from "@/app/_components/TopBar/TopBar";
import { PATHS } from "@/app/_lib/paths";
import { getResult } from "@/features/interview/api";
import { todayInSeoul } from "@/features/interview/setup";
import { requireMember } from "@/features/session/guard";
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

async function Result({ params }: Props) {
  const { id } = await params;
  await requireMember(PATHS.interviewResult(id));
  const found = await getResult(id);
  if (!found) notFound();
  if (found.state === "inProgress") redirect(PATHS.interview(id));
  if (found.state === "analyzing") redirect(PATHS.interviewAnalyzing(id));
  if (found.result.items.length === 0) notFound();
  return (
    <>
      <div className={styles.screen}>
        <ResultView key={id} result={found.result} today={todayInSeoul(new Date())} />
      </div>
      <PrintReport result={found.result} />
    </>
  );
}

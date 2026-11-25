import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Main } from "@/app/_components/Main/Main";
import { getInterview, isGazeReady } from "@/features/interview/api";
import { requireMember } from "@/features/session/guard";
import { InterviewRoom } from "./_components/InterviewRoom/InterviewRoom";

export const metadata: Metadata = { title: "면접 진행" };

type Props = { params: Promise<{ id: string }> };

/** 푸터가 없는 화면이라 본문을 직접 그린다 */
export default function InterviewPage({ params }: Props) {
  return (
    <Main>
      <Suspense>
        <Room params={params} />
      </Suspense>
    </Main>
  );
}

async function Room({ params }: Props) {
  const { id } = await params;
  await requireMember(`/interviews/${id}`);
  const [interview, gazeReady] = await Promise.all([getInterview(id), isGazeReady()]);
  if (!interview) notFound();
  return <InterviewRoom key={interview.id} interview={interview} gazeReady={gazeReady} />;
}

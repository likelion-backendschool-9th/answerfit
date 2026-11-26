import type { Metadata } from "next";
import { Suspense } from "react";
import { Main } from "@/app/_components/Main/Main";
import { TopBar } from "@/app/_components/TopBar/TopBar";
import { PATHS } from "@/app/_lib/paths";
import { getDocumentGroups, isGazeReady } from "@/features/interview/api";
import { initialSetup, todayInSeoul } from "@/features/interview/setup";
import { requireMember } from "@/features/session/guard";
import { InterviewSetup } from "./_components/InterviewSetup/InterviewSetup";

export const metadata: Metadata = { title: "모의 면접 준비" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** 푸터가 없는 화면이라 본문을 직접 그린다 */
export default function NewInterviewPage({ searchParams }: Props) {
  return (
    <Main>
      <TopBar current={PATHS.newInterview} />
      <Suspense>
        <Setup searchParams={searchParams} />
      </Suspense>
    </Main>
  );
}

async function Setup({ searchParams }: Props) {
  await requireMember(PATHS.newInterview);
  const [groups, gazeReady, params] = await Promise.all([getDocumentGroups(), isGazeReady(), searchParams]);
  const today = todayInSeoul(new Date());
  const initial = initialSetup(groups, params, today);
  return <InterviewSetup key={JSON.stringify(initial)} initial={initial} groups={groups} gazeReady={gazeReady} today={today} />;
}

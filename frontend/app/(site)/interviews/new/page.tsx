import type { Metadata } from "next";
import { Suspense } from "react";
import { TopBar } from "@/app/_components/TopBar/TopBar";
import { PATHS } from "@/app/_lib/paths";
import { getDocumentGroups, isGazeReady } from "@/features/interview/api";
import { todayInSeoul } from "@/features/interview/setup";
import { requireMember } from "@/features/session/guard";
import { InterviewSetup } from "./_components/InterviewSetup/InterviewSetup";

export const metadata: Metadata = { title: "모의 면접 준비" };

export default function NewInterviewPage() {
  return (
    <>
      <TopBar current={PATHS.newInterview} />
      <Suspense>
        <Setup />
      </Suspense>
    </>
  );
}

async function Setup() {
  await requireMember(PATHS.newInterview);
  const [groups, gazeReady] = await Promise.all([getDocumentGroups(), isGazeReady()]);
  return <InterviewSetup groups={groups} gazeReady={gazeReady} today={todayInSeoul(new Date())} />;
}

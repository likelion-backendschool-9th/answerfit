import type { Metadata } from "next";
import { Suspense } from "react";
import { TopBar } from "@/app/_components/TopBar/TopBar";
import { PATHS } from "@/app/_lib/paths";
import { getExperiences } from "@/features/experience/api";
import { requireMember } from "@/features/session/guard";
import { ExperienceBoard } from "./_components/ExperienceBoard/ExperienceBoard";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "경험 정리" };

export default function ExperiencesPage() {
  return (
    <>
      <TopBar current={PATHS.experiences} />
      <div className={styles.content}>
        <Suspense fallback={<ExperienceBoard items={null} />}>
          <Board />
        </Suspense>
      </div>
    </>
  );
}

async function Board() {
  await requireMember(PATHS.experiences);
  return <ExperienceBoard items={await getExperiences()} />;
}

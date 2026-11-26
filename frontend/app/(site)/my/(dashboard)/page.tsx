import type { Metadata } from "next";
import { PATHS } from "@/app/_lib/paths";
import { ButtonLink } from "@/components/ui/Button/Button";
import { getRecords } from "@/features/interview/api";
import { averageScore, PREVIOUS_LABEL, PERIODS, readPeriod, splitByPeriod, typeStats, type RecordQuery } from "@/features/interview/records";
import { getLearning } from "@/features/member/api";
import { radarCategories } from "@/features/member/learning";
import { getLikedAnswers, getQuestions } from "@/features/question/api";
import { requireMember } from "@/features/session/guard";
import { cn } from "@/lib/cn";
import { PageHeading } from "../_components/PageHeading/PageHeading";
import { CategoryBars } from "./_components/CategoryBars/CategoryBars";
import { CategoryRadar } from "./_components/CategoryRadar/CategoryRadar";
import { PeriodTabs } from "./_components/PeriodTabs/PeriodTabs";
import { RecentLists } from "./_components/RecentLists/RecentLists";
import { StatCards } from "./_components/StatCards/StatCards";
import { TypeRings } from "./_components/TypeRings/TypeRings";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "마이페이지" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const SHOWN_TYPES = ["experience", "cs", "personality"] as const satisfies readonly NonNullable<RecordQuery["type"]>[];

export default async function DashboardPage({ searchParams }: Props) {
  const period = readPeriod((await searchParams).period);
  const { nickname } = await requireMember(PATHS.my);
  const [records, learning, questions, answers] = await Promise.all([getRecords(), getLearning(), getQuestions(), getLikedAnswers()]);
  const now = new Date();
  const month = splitByPeriod(records, "month", now).current;
  const liked = questions.filter((question) => question.liked);
  const previous = PREVIOUS_LABEL[period];
  return (
    <>
      <PageHeading title={`안녕하세요, ${nickname}님`} description="오늘도 꾸준히 면접 연습 도전해봐요!">
        <ButtonLink href={PATHS.newInterview} className={styles.start}>
          모의 면접 시작
        </ButtonLink>
      </PageHeading>
      <StatCards count={month.length} score={averageScore(month)} streak={learning.streakDays} liked={liked.length + answers.length} />
      <section className={styles.panel} aria-labelledby="score-title">
        <div className={styles.top}>
          <div>
            <h2 id="score-title" className={styles.title}>
              분야별 평균 점수
            </h2>
            <p className={styles.note}>
              {PERIODS[period]} 응시 기준{previous && ` · ${previous}과 비교`}
            </p>
          </div>
          <PeriodTabs period={period} />
        </div>
        <TypeRings stats={SHOWN_TYPES.map((type) => ({ type, ...typeStats(records, type, period, now) }))} period={period} />
        {/* 분야가 적어 레이더를 그리지 않으면 목록이 한 칸을 다 쓴다 */}
        <div className={cn(styles.categories, radarCategories(learning.categories[period]).length === 0 && styles.listOnly)}>
          <CategoryRadar categories={learning.categories[period]} period={period} />
          <CategoryBars categories={learning.categories[period]} />
        </div>
      </section>
      <RecentLists records={records.slice(0, 3)} liked={liked.slice(0, 3)} />
    </>
  );
}

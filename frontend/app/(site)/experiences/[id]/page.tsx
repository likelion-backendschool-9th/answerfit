import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TopBar } from "@/app/_components/TopBar/TopBar";
import { PATHS } from "@/app/_lib/paths";
import { Icon } from "@/components/ui/Icon/Icon";
import { getExperiences } from "@/features/experience/api";
import { customTags } from "@/features/experience/rules";
import { requireMember } from "@/features/session/guard";
import { ExperienceForm } from "../_components/ExperienceForm/ExperienceForm";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "경험 상세" };

/** 이 주소면 새 경험을 적는다 */
const NEW = "new";

type Props = { params: Promise<{ id: string }> };

/** 모바일에서 카드를 누르면 오는 상세 화면. 데스크톱은 표의 오른쪽 패널을 쓴다 */
export default function ExperiencePage({ params }: Props) {
  return (
    <>
      <TopBar current={PATHS.experiences} />
      <div className={styles.content}>
        <Link href={PATHS.experiences} className={styles.back}>
          <Icon name="back" size={18} /> 경험 목록
        </Link>
        <Suspense>
          <Detail params={params} />
        </Suspense>
      </div>
    </>
  );
}

async function Detail({ params }: Props) {
  const { id } = await params;
  await requireMember(PATHS.experience(id));
  const items = await getExperiences();
  const experience = items.find((item) => item.id === id) ?? null;
  if (id !== NEW && !experience) notFound();
  return (
    <>
      <h1 className={styles.title}>{experience?.title || "새 경험"}</h1>
      <div className={styles.form}>
        <ExperienceForm experience={experience} custom={customTags(items)} backHref={PATHS.experiences} />
      </div>
    </>
  );
}

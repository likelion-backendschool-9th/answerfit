import type { Metadata } from "next";
import { Suspense } from "react";
import { TopBar } from "@/app/_components/TopBar/TopBar";
import { PATHS } from "@/app/_lib/paths";
import { Pagination } from "@/components/ui/Pagination/Pagination";
import { getArchive } from "@/features/question/api";
import { RegisterButton } from "@/features/question/components/RegisterButton/RegisterButton";
import { archiveHref, KIND_LABEL, readQuery } from "@/features/question/rules";
import { requireMember } from "@/features/session/guard";
import { ArchiveFilters } from "./_components/ArchiveFilters/ArchiveFilters";
import { ArchiveTabs } from "./_components/ArchiveTabs/ArchiveTabs";
import { QuestionList } from "./_components/QuestionList/QuestionList";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "질문 아카이브" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default function ArchivePage({ searchParams }: Props) {
  return (
    <>
      <TopBar current={PATHS.archive} />
      <div className={styles.content}>
        <div className={styles.top}>
          <div>
            <h1 className={styles.title}>질문 아카이브</h1>
            <p className={styles.description}>면접에 자주 나오는 질문과 모범답안을 모아 뒀어요. 좋아요한 질문은 마이페이지에서 다시 볼 수 있어요.</p>
          </div>
          <RegisterButton />
        </div>
        <Suspense>
          <Archive searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function Archive({ searchParams }: Props) {
  const requested = readQuery(await searchParams);
  await requireMember(archiveHref(requested, { page: requested.page }));
  const { items, total, page, pages, majorCounts, categories, query } = await getArchive(requested);
  const kinds = (["cs", "personality"] as const).map((kind) => ({ kind,
    label: categories.find((group) => group.kind === kind)?.label ?? KIND_LABEL[kind], count: majorCounts[kind] }));
  const filtered = Boolean(query.keyword || query.likedOnly);
  return (
    <>
      <ArchiveTabs query={query} kinds={kinds} categories={categories.find(({ kind }) => kind === query.kind)?.categories ?? []} />
      <ArchiveFilters key={archiveHref(query)} query={query} />
      {items.length > 0 ? <QuestionList items={items} /> : <p className={styles.empty}>{filtered ? "조건에 맞는 질문이 없어요." : "아직 질문이 없어요."}</p>}
      <p className={styles.hidden} role="status">
        질문 {total}개
      </p>
      <Pagination page={page} pages={pages} href={(target) => archiveHref(query, { page: target })} />
    </>
  );
}

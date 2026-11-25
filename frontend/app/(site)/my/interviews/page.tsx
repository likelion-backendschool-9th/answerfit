import type { Metadata } from "next";
import { Icon } from "@/components/ui/Icon/Icon";
import { FilterChips } from "@/components/ui/FilterChips/FilterChips";
import { Pagination } from "@/components/ui/Pagination/Pagination";
import { getRecords } from "@/features/interview/api";
import { readRecordQuery, RECORD_SHORT, RECORD_TYPES, recordsHref, searchRecords } from "@/features/interview/records";
import { todayInSeoul } from "@/features/interview/setup";
import { requireMember } from "@/features/session/guard";
import { PageHeading } from "../_components/PageHeading/PageHeading";
import { RecordFilters } from "./_components/RecordFilters/RecordFilters";
import { RecordTable } from "./_components/RecordTable/RecordTable";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "면접 기록" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function RecordsPage({ searchParams }: Props) {
  const query = readRecordQuery(await searchParams);
  await requireMember(recordsHref(query, { page: query.page }));
  const records = await getRecords();
  const { items, page, pages } = searchRecords(records, query);
  const chips = [
    { label: "전체", count: records.length, href: recordsHref(query, { type: null }), current: query.type === null },
    ...RECORD_TYPES.map((type) => ({ label: RECORD_SHORT[type], count: records.filter((record) => record.type === type).length, href: recordsHref(query, { type }), current: query.type === type })),
  ];
  return (
    <>
      <PageHeading title="면접 기록" description="항목을 누르면 결과를 다시 볼 수 있어요." />
      <div className={styles.filters}>
        <FilterChips label="면접 유형" chips={chips} />
        <RecordFilters key={recordsHref(query)} query={query} />
      </div>
      {items.length > 0 ? <RecordTable items={items} today={todayInSeoul(new Date())} /> : <p className={styles.empty}>{query.keyword || query.type ? "조건에 맞는 면접이 없어요." : "아직 본 면접이 없어요."}</p>}
      <Pagination page={page} pages={pages} href={(target) => recordsHref(query, { page: target })} />
      <p className={styles.note}>
        <Icon name="trash" size={16} /> 녹화 영상은 서류 그룹의 기업 면접일이 지나면 삭제돼요. 점수와 AI 피드백은 계속 남아요.
      </p>
    </>
  );
}

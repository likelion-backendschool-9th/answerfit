import type { Metadata } from "next";
import { getMembers, getMemberSummary } from "@/features/admin/api";
import { membersHref, readMemberQuery, searchMembers } from "@/features/admin/rules";
import { todayInSeoul } from "@/features/interview/setup";
import { requireAdmin } from "@/features/session/guard";
import { AdminPage } from "../_components/AdminPage/AdminPage";
import { Segments } from "../_components/Segments/Segments";
import { TableFooter } from "../_components/TableFooter/TableFooter";
import { MemberFilters } from "./_components/MemberFilters/MemberFilters";
import { MemberStats } from "./_components/MemberStats/MemberStats";
import { MemberTable } from "./_components/MemberTable/MemberTable";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "회원 관리" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminMembersPage({ searchParams }: Props) {
  const query = readMemberQuery(await searchParams);
  await requireAdmin(membersHref(query, { page: query.page }));
  const [members, summary] = await Promise.all([getMembers(), getMemberSummary()]);
  const today = todayInSeoul(new Date());
  const { items, ...range } = searchMembers(members, query);
  const suspended = members.filter(({ suspension }) => suspension).length;
  const segments = [
    { label: "전체", count: members.length, href: membersHref(query, { status: null }), current: query.status === null },
    { label: "정상", count: members.length - suspended, href: membersHref(query, { status: "active" }), current: query.status === "active" },
    { label: "이용 정지", count: suspended, href: membersHref(query, { status: "suspended" }), current: query.status === "suspended" },
  ];
  return (
    <AdminPage title="회원 관리" description="회원을 찾아보고, 서비스 규칙을 어긴 회원은 이용을 정지할 수 있어요." today={today}>
      <MemberStats total={members.length} suspended={suspended} summary={summary} />
      <div className={styles.filters}>
        <Segments label="상태" items={segments} />
        <MemberFilters key={membersHref(query)} query={query} />
      </div>
      {items.length > 0 ? <MemberTable items={items} today={today} /> : <p className={styles.empty}>조건에 맞는 회원이 없어요.</p>}
      <TableFooter unit="명" {...range} href={(page) => membersHref(query, { page })} />
    </AdminPage>
  );
}

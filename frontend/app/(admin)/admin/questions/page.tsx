import type { Metadata } from "next";
import { getBank, getPending, getReports } from "@/features/admin/api";
import { readBankQuery, readTab, tabHref } from "@/features/admin/rules";
import { todayInSeoul } from "@/features/interview/setup";
import { requireAdmin } from "@/features/session/guard";
import { AdminPage } from "../_components/AdminPage/AdminPage";
import { AdminTabs } from "./_components/AdminTabs/AdminTabs";
import { BankView } from "./_components/BankView/BankView";
import { PendingList } from "./_components/PendingList/PendingList";
import { ReportView } from "./_components/ReportView/ReportView";

export const metadata: Metadata = { title: "질문 관리" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminQuestionsPage({ searchParams }: Props) {
  const params = await searchParams;
  const tab = readTab(params);
  await requireAdmin(tabHref(tab));
  const [bank, pending, reports] = await Promise.all([getBank(), getPending(), getReports()]);
  const today = todayInSeoul(new Date());
  return (
    <AdminPage title="질문 관리" description="문제 은행 질문과 모범답안, 사용자가 올린 질문, 신고를 한곳에서 처리해요." today={today}>
      <AdminTabs current={tab} counts={{ bank: bank.length, pending: pending.length, reports: reports.filter(({ status }) => status === "waiting").length }} />
      {tab === "bank" && <BankView questions={bank} query={readBankQuery(params)} />}
      {tab === "pending" && <PendingList questions={pending} today={today} />}
      {tab === "reports" && <ReportView reports={reports} selected={params.report} />}
    </AdminPage>
  );
}

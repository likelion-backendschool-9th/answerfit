import "server-only";
import { demoMemberSummary, listDemoMembers, releaseDemoMember, suspendDemoMember } from "@/demo/members";
import { getDataMode } from "@/demo/mode";
import { approveDemoQuestion, generatedAnswer, listDemoBank, listDemoPending, listDemoReports, removeDemoBank, removeDemoQuestion, saveDemoBank, settleDemoReport } from "@/demo/question";
import { requireAdmin } from "@/features/session/guard";
import { getAccessToken } from "@/features/session/session";
import { callBackend } from "@/lib/backend-http";
import type { AdminMember, BankQuestion, MemberSummary, PendingQuestion, QuestionDraft, ReportedQuestion, ReportStatus, Suspension } from "./types";

const call = async <T>(path: string, method = "GET", body?: object) => callBackend<T>(`/api/admin${path}`, { method, body, token: await getAccessToken() });
const segment = encodeURIComponent;

/** 모든 데이터 함수가 부른다. 화면의 확인을 믿지 않는다 */
async function inMock() {
  await requireAdmin();
  return (await getDataMode()) === "mock";
}

export async function getBank(): Promise<BankQuestion[]> {
  return (await inMock()) ? listDemoBank() : call("/questions");
}

export async function getPending(): Promise<PendingQuestion[]> {
  return (await inMock()) ? listDemoPending() : call("/questions/pending");
}

export async function getReports(): Promise<ReportedQuestion[]> {
  return (await inMock()) ? listDemoReports() : call("/reports");
}

/** 메뉴에 보여 줄, 처리할 일의 개수 */
export async function getTodoCount(): Promise<number> {
  const [pending, reports] = await Promise.all([getPending(), getReports()]);
  return pending.length + reports.filter(({ status }) => status === "waiting").length;
}

const inBank = async (id: string) => (await getBank()).some((question) => question.id === id);

/** 없는 질문이면 false */
export async function saveBank(id: string | null, draft: QuestionDraft): Promise<boolean> {
  if (id && !(await inBank(id))) return false;
  if (await inMock()) await saveDemoBank(id, draft);
  else await call(id ? `/questions/${segment(id)}` : "/questions", id ? "PUT" : "POST", draft);
  return true;
}

export async function removeBank(ids: string[]): Promise<boolean> {
  const bank = await getBank();
  const known = ids.filter((id) => bank.some((question) => question.id === id));
  if (known.length === 0) return false;
  if (await inMock()) await removeDemoBank(known);
  else await call("/questions", "DELETE", { ids: known });
  return true;
}

export async function generateAnswer(text: string): Promise<{ answer: string; keywords: string[] }> {
  if (!(await inMock())) return call("/questions/answer", "POST", { text });
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return generatedAnswer(text);
}

const isPending = async (id: string) => (await getPending()).some((question) => question.id === id);

export async function approve(id: string): Promise<boolean> {
  if (!(await isPending(id))) return false;
  if (await inMock()) await approveDemoQuestion(id);
  else await call(`/questions/pending/${segment(id)}/approve`, "POST", {});
  return true;
}

export async function reject(id: string): Promise<boolean> {
  if (!(await isPending(id))) return false;
  if (await inMock()) await removeDemoQuestion(id);
  else await call(`/questions/pending/${segment(id)}`, "DELETE");
  return true;
}

export async function settleReport(id: string, status: ReportStatus): Promise<boolean> {
  if (!(await getReports()).some((report) => report.id === id)) return false;
  if (await inMock()) await settleDemoReport(id, status);
  else await call(`/reports/${segment(id)}`, "PUT", { status });
  return true;
}

export async function getMembers(): Promise<AdminMember[]> {
  return (await inMock()) ? listDemoMembers() : call("/members");
}

export async function getMemberSummary(): Promise<MemberSummary> {
  return (await inMock()) ? demoMemberSummary() : call("/members/summary");
}

const findMember = async (id: string) => (await getMembers()).find((member) => member.id === id);

/** 없거나 이미 정지된 회원이면 false */
export async function suspend(id: string, suspension: Suspension): Promise<boolean> {
  const member = await findMember(id);
  if (!member || member.suspension) return false;
  if (await inMock()) await suspendDemoMember(id, suspension);
  else await call(`/members/${segment(id)}/suspension`, "PUT", suspension);
  return true;
}

export async function release(id: string): Promise<boolean> {
  const member = await findMember(id);
  if (!member?.suspension) return false;
  if (await inMock()) await releaseDemoMember(id);
  else await call(`/members/${segment(id)}/suspension`, "DELETE");
  return true;
}

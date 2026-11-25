import "server-only";
import { dayLabel, isSuspended } from "@/features/admin/rules";
import type { AdminMember, LoginProvider, MemberSummary, Suspension } from "@/features/admin/types";
import { daysUntil } from "@/features/interview/result";
import { todayInSeoul } from "@/features/interview/setup";
import { demoDate } from "./clock";
import { readStore, writeStore } from "./store";

const SUSPENSIONS = "suspensions";
const RELEASES = "releases";

type Row = [id: string, nickname: string, email: string, provider: LoginProvider, joined: string, seen: string, interviews: number, questions: number];

const ROWS: Row[] = [
  ["jiwoo", "지우", "jiwoo@answerfit.kr", "github", "2026-09-14", "2026-11-25", 23, 4],
  ["minjun", "민준", "minjun@answerfit.kr", "local", "2026-10-02", "2026-11-25", 11, 1],
  ["seoyeon", "서연", "seoyeon@answerfit.kr", "kakao", "2026-10-19", "2026-11-24", 8, 1],
  ["hyunwoo", "현우", "hyunwoo@example.com", "local", "2026-11-01", "2026-11-20", 2, 0],
  ["haeun", "하은", "haeun@example.com", "github", "2026-11-08", "2026-11-24", 5, 0],
  ["doyun", "도윤", "doyun@example.com", "kakao", "2026-11-15", "2026-11-23", 3, 0],
  ["sua", "수아", "sua@example.com", "local", "2026-11-21", "2026-11-25", 1, 0],
  ["yejun", "예준", "yejun@example.com", "local", "2026-11-22", "2026-11-22", 0, 6],
  ["jiho", "지호", "jiho@example.com", "google", "2026-08-30", "2026-11-21", 14, 0],
  ["yuna", "유나", "yuna@example.com", "kakao", "2026-09-03", "2026-11-25", 9, 0],
  ["siwoo", "시우", "siwoo@example.com", "local", "2026-09-20", "2026-11-18", 6, 0],
  ["chaewon", "채원", "chaewon@example.com", "google", "2026-10-11", "2026-11-25", 7, 0],
  ["junseo", "준서", "junseo@example.com", "github", "2026-10-27", "2026-11-19", 4, 0],
  ["minseo", "민서", "minseo@example.com", "local", "2026-11-19", "2026-11-25", 2, 0],
];

const defaults = (): Record<string, Suspension | null> => ({
  hyunwoo: { releaseOn: demoDate("2026-12-02"), reason: "다른 회원의 질문을 여러 번 베껴 등록했어요." },
  yejun: { releaseOn: null, reason: "광고 질문을 반복해서 등록했어요." },
});
const readSuspensions = () => readStore(SUSPENSIONS, defaults());

export async function listDemoMembers(): Promise<AdminMember[]> {
  const suspensions = await readSuspensions();
  const today = todayInSeoul(new Date());
  return ROWS.map(([id, nickname, email, provider, joined, seen, interviews, questions]) => {
    const found = suspensions[id] ?? null;
    return { id, nickname, email, provider, joinedOn: demoDate(joined), lastSeenOn: demoDate(seen), interviews, questions, suspension: found && isSuspended(found.releaseOn, today) ? found : null };
  });
}

export async function demoMemberSummary(): Promise<MemberSummary> {
  const [members, releases] = await Promise.all([listDemoMembers(), readStore<number>(RELEASES, 0)]);
  const today = todayInSeoul(new Date());
  return {
    joinedThisWeek: members.filter(({ joinedOn }) => daysUntil(today, joinedOn) < 7).length,
    seenToday: members.filter(({ lastSeenOn }) => lastSeenOn === today).length,
    interviewsThisMonth: members.reduce((sum, { interviews }) => sum + interviews, 0),
    releasedThisWeek: releases,
  };
}

export async function suspendDemoMember(id: string, suspension: Suspension) {
  await writeStore(SUSPENSIONS, { ...(await readSuspensions()), [id]: suspension });
}

export async function releaseDemoMember(id: string) {
  await writeStore(SUSPENSIONS, { ...(await readSuspensions()), [id]: null });
  await writeStore(RELEASES, (await readStore<number>(RELEASES, 0)) + 1);
}

/** 정지된 회원에게 로그인할 때 보여 줄 안내 */
export async function demoSuspensionMessage(email: string): Promise<string | null> {
  const member = (await listDemoMembers()).find((one) => one.email === email.toLowerCase());
  if (!member?.suspension) return null;
  const { releaseOn, reason } = member.suspension;
  return `이용이 정지된 계정이에요. ${releaseOn ? `${dayLabel(releaseOn)} 00:00에 풀려요.` : "기간은 영구예요."} 사유: ${reason}`;
}

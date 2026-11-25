import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getSession } from "./session";
import type { Session } from "./types";

/** 로그인하지 않았으면 로그인 화면으로 보낸다. 화면과 데이터 함수가 모두 부른다 */
export async function requireMember(next = "/"): Promise<Session> {
  // 회원 화면은 오늘 날짜에 따라 달라진다. 미리 그리지 않고 요청이 올 때 그린다
  await connection();
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(next)}`);
  return session;
}

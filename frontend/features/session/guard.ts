import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "./session";
import type { Session } from "./types";

/** 로그인하지 않았으면 로그인 화면으로 보낸다. 화면과 데이터 함수가 모두 부른다 */
export async function requireMember(next = "/"): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(next)}`);
  return session;
}

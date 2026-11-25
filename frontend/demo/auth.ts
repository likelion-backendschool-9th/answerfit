import "server-only";
import { cookies } from "next/headers";
import type { Session } from "@/features/session/types";
import { DEMO_ADMIN, DEMO_MEMBER } from "./session";

/** 시연 계정의 비밀번호. 실제 계정이 아니다 */
const DEMO_PASSWORD = "answerfit1";
const COOKIE = "demo-members";
const MAX_MEMBERS = 5;

/** 목업에서 가입한 회원. 비밀번호와 사진은 저장하지 않는다 */
async function readMembers(): Promise<Session[]> {
  try {
    const value: unknown = JSON.parse((await cookies()).get(COOKIE)?.value ?? "[]");
    return Array.isArray(value) ? value.filter((m) => typeof m?.email === "string" && typeof m?.nickname === "string") : [];
  } catch {
    return [];
  }
}

const same = (email: string) => (member: Session) => member.email.toLowerCase() === email.toLowerCase();

export async function isDemoEmailTaken(email: string) {
  return [DEMO_MEMBER, DEMO_ADMIN, ...(await readMembers())].some(same(email));
}

/** 가입한 회원은 저장한 비밀번호가 없어 시연 비밀번호로 로그인한다 */
export async function findDemoMember(email: string, password: string): Promise<Session | null> {
  if (password !== DEMO_PASSWORD) return null;
  const found = [DEMO_MEMBER, DEMO_ADMIN, ...(await readMembers())].find(same(email));
  return found ? { ...found } : null;
}

export async function addDemoMember(email: string, nickname: string): Promise<Session> {
  const member: Session = { email, nickname, role: "member" };
  const members = [...(await readMembers()), member].slice(-MAX_MEMBERS);
  (await cookies()).set(COOKIE, JSON.stringify(members), { path: "/", sameSite: "lax", httpOnly: true });
  return member;
}

export const demoSocialMember = () => DEMO_MEMBER;

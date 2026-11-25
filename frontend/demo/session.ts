import "server-only";
import { cookies } from "next/headers";
import type { Session } from "@/features/session/types";

const COOKIE = "demo-session";

export const DEMO_MEMBER: Session = { email: "jiwoo@answerfit.kr", nickname: "지우", role: "member" };
export const DEMO_ADMIN: Session = { email: "admin@answerfit.kr", nickname: "운영 관리자", role: "admin" };

export async function readDemoSession(): Promise<Session | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<Session>;
    if (typeof value.email !== "string" || typeof value.nickname !== "string") return null;
    return { email: value.email, nickname: value.nickname, role: value.role === "admin" ? "admin" : "member" };
  } catch {
    return null;
  }
}

export async function writeDemoSession(session: Session, maxAge?: number) {
  (await cookies()).set(COOKIE, JSON.stringify(session), { path: "/", sameSite: "lax", httpOnly: true, maxAge });
}

export async function clearDemoSession() {
  (await cookies()).delete(COOKIE);
}

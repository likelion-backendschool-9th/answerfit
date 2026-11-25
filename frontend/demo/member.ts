import "server-only";
import { cookies } from "next/headers";
import type { CategoryScore, Learning } from "@/features/member/learning";
import type { LinkedLogin, Profile } from "@/features/member/types";
import { DEMO_PASSWORD, renameDemoMember } from "./auth";
import { readDemoSession, writeDemoSession } from "./session";
import { clearStore } from "./store";

const LINKS = "demo-links";

const CATEGORIES: [name: string, month: number, last: number, quarter: number, before: number, all: number][] = [
  ["운영체제", 72, 70, 70, 67, 69],
  ["네트워크", 81, 76, 77, 71, 74],
  ["데이터베이스", 64, 66, 65, 63, 65],
  ["자료구조", 76, 71, 73, 70, 72],
  ["알고리즘", 58, 55, 57, 56, 57],
  ["웹", 70, 68, 69, 66, 68],
  ["보안", 66, 60, 63, 58, 61],
  ["디자인 패턴", 74, 72, 72, 71, 71],
];

export const demoLearning = (): Learning => ({
  streakDays: 5,
  categories: {
    month: CATEGORIES.map(([name, score, previous]): CategoryScore => ({ name, score, previous })),
    quarter: CATEGORIES.map(([name, , , score, previous]): CategoryScore => ({ name, score, previous })),
    all: CATEGORIES.map(([name, , , , , score]): CategoryScore => ({ name, score, previous: null })),
  },
});

async function readLinks(): Promise<LinkedLogin[]> {
  const raw = (await cookies()).get(LINKS)?.value;
  const on = raw === undefined ? ["github"] : raw.split(",");
  return [
    { provider: "github", label: "GitHub", account: on.includes("github") ? "jiwoo-dev" : null },
    { provider: "kakao", label: "카카오", account: on.includes("kakao") ? "jiwoo" : null },
  ];
}

export async function demoProfile(): Promise<Profile | null> {
  const session = await readDemoSession();
  return session && { nickname: session.nickname, email: session.email, links: await readLinks() };
}

export async function updateDemoNickname(nickname: string) {
  const session = await readDemoSession();
  if (!session) return;
  await writeDemoSession({ ...session, nickname });
  await renameDemoMember(session.email, nickname);
}

/** 시연 계정의 비밀번호는 실제로 바꾸지 않는다 */
export const isDemoPassword = (password: string) => password === DEMO_PASSWORD;

export async function setDemoLink(provider: string, linked: boolean) {
  const on = (await readLinks()).filter((link) => (link.provider === provider ? linked : link.account)).map((link) => link.provider);
  (await cookies()).set(LINKS, on.join(","), { path: "/", sameSite: "lax", httpOnly: true });
}

/** 시연 기록을 모두 지운다. 모드 선택은 남긴다 */
export async function clearDemoRecords() {
  await clearStore();
  const store = await cookies();
  for (const { name } of store.getAll()) if (name.startsWith("demo-") && name !== "demo-mode") store.delete(name);
}

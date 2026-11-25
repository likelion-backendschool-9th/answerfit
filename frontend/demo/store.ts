import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "demo-visitor";
/** 오래된 방문자의 기록부터 지운다 */
const MAX_VISITORS = 500;

type Records = Map<string, unknown>;
const shared = globalThis as typeof globalThis & { answerfitDemo?: Map<string, Records> };
const visitors = (shared.answerfitDemo ??= new Map<string, Records>());

/**
 * 방문자마다 나눈 시연 기록. 쿠키는 4KB를 넘으면 조용히 버려져서 서버 메모리에 둔다.
 * 서버를 다시 켜면 처음 상태로 돌아간다.
 */
export async function readStore<T>(key: string, fallback: T): Promise<T> {
  const id = (await cookies()).get(COOKIE)?.value;
  const records = id ? visitors.get(id) : undefined;
  return records?.has(key) ? (records.get(key) as T) : fallback;
}

export async function writeStore(key: string, value: unknown) {
  const store = await cookies();
  const id = store.get(COOKIE)?.value ?? randomUUID();
  store.set(COOKIE, id, { path: "/", sameSite: "lax", httpOnly: true });
  const records = visitors.get(id) ?? new Map();
  records.set(key, value);
  visitors.delete(id);
  visitors.set(id, records);
  for (const oldest of visitors.keys()) {
    if (visitors.size <= MAX_VISITORS) break;
    visitors.delete(oldest);
  }
}

export async function clearStore() {
  const id = (await cookies()).get(COOKIE)?.value;
  if (id) visitors.delete(id);
}

import "server-only";
import { safeNextPath } from "@/lib/next-path";
import { getSession } from "@/features/session/session";

/** 로그인 뒤 갈 곳. 갈 곳을 정하지 않은 관리자는 관리자 화면으로 보낸다 */
export async function landing(next: unknown) {
  const path = safeNextPath(next);
  return path === "/" && (await getSession())?.role === "admin" ? "/admin" : path;
}

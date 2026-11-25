import "server-only";
import { cookies } from "next/headers";
import { canSwitchMode, resolveMode, type DataMode } from "./rules";

const COOKIE = "demo-mode";
const env = () => ({ APP_ENV: process.env.APP_ENV, NODE_ENV: process.env.NODE_ENV });

/** 요청마다 정한다. 쿠키를 먼저 읽어야 빌드 때의 환경 값이 화면에 굳지 않는다 */
export async function getDataMode(): Promise<DataMode> {
  const saved = (await cookies()).get(COOKIE)?.value;
  return resolveMode(env(), saved);
}

export const isSwitchable = () => canSwitchMode(env());

export async function saveDataMode(mode: DataMode) {
  (await cookies()).set(COOKIE, mode, { path: "/", sameSite: "lax", httpOnly: true });
}

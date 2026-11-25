/** 모드·역할 전환의 순수 규칙. 쿠키는 mode.ts와 session.ts가 읽고 쓴다 */
export const DATA_MODES = ["mock", "api"] as const;
export type DataMode = (typeof DATA_MODES)[number];

export const DEMO_ROLES = ["guest", "member", "admin"] as const;
export type DemoRole = (typeof DEMO_ROLES)[number];

type Env = { APP_ENV?: string; NODE_ENV?: string };

/** 로컬과 테스트 서버에서만 전환할 수 있다. 환경을 모르면 운영으로 보고 숨긴다 */
export function canSwitchMode({ APP_ENV, NODE_ENV }: Env) {
  if (APP_ENV) return APP_ENV === "local" || APP_ENV === "test";
  return NODE_ENV === "development";
}

/** 운영에서는 쿠키가 있어도 항상 실제 API를 쓴다 */
export function resolveMode(env: Env, saved: string | undefined): DataMode {
  if (!canSwitchMode(env)) return "api";
  return saved === "api" ? "api" : "mock";
}

export const isDataMode = (value: unknown): value is DataMode => DATA_MODES.includes(value as DataMode);
export const isDemoRole = (value: unknown): value is DemoRole => DEMO_ROLES.includes(value as DemoRole);

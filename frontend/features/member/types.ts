/** 백엔드 형식은 모두 미확정 */
export type LinkedLogin = { provider: "github" | "kakao"; label: string; /** 연결된 계정 이름. 연결하지 않았으면 null */ account: string | null };
export type Profile = { nickname: string; email: string; links: LinkedLogin[] };
export type SaveResult<E = { error?: string }> = { ok: boolean; message?: string; errors?: E };

/** 로그인한 회원. 백엔드 형식은 미확정 */
export type Session = { email: string; nickname: string; role: "member" | "admin" };

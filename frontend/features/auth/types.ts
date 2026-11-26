/** 백엔드 형식은 모두 미확정 */
export const SOCIAL_PROVIDERS = ["google", "github", "kakao"] as const;
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

export type LoginInput = { email: string; password: string; remember: boolean };
export type SignupConsents = { termsOfService: boolean; privacyCollection: boolean; interviewRecording: boolean };
export type SignupInput = { email: string; password: string; nickname: string; photo: File | null; consents: SignupConsents };

/** 로그인 폼 상태. 비밀번호는 돌려보내지 않는다 */
export type LoginState = { error?: string; email?: string; remember?: boolean };

export type AccountErrors = { email?: string; password?: string; passwordConfirm?: string; agreements?: string };
export type ProfileErrors = { nickname?: string; photo?: string };

export type SignupResult = { ok: true; signedIn?: boolean } | { ok: false; account?: AccountErrors; profile?: ProfileErrors; error?: string };

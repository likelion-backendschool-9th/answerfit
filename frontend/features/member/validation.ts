export const PHOTO_TYPES = ["image/jpeg", "image/png"];
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export function passwordError(password: string) {
  if (!password) return "비밀번호를 입력해 주세요.";
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return "영문과 숫자를 섞어 8자 이상 입력해 주세요.";
}

export function nicknameError(nickname: string) {
  if (!/^[가-힣A-Za-z0-9]{2,12}$/.test(nickname)) return "닉네임은 2~12자로, 한글 · 영문 · 숫자만 쓸 수 있어요.";
}

export function photoError(photo: { type: string; size: number }) {
  if (!PHOTO_TYPES.includes(photo.type)) return "JPG나 PNG 파일만 올릴 수 있어요.";
  if (photo.size > PHOTO_MAX_BYTES) return "5MB 이하 파일만 올릴 수 있어요.";
}

export type PasswordInput = { current: string; next: string; confirm: string };
export type PasswordErrors = Partial<Record<keyof PasswordInput, string>>;

/** 오류가 없는 칸은 넣지 않는다 */
export function passwordChangeErrors({ current, next, confirm }: PasswordInput): PasswordErrors {
  const errors: PasswordErrors = {};
  const bad = passwordError(next);
  if (!current) errors.current = "현재 비밀번호를 입력해 주세요.";
  if (bad) errors.next = bad;
  else if (next === current) errors.next = "지금과 다른 비밀번호를 입력해 주세요.";
  if (!confirm) errors.confirm = "새 비밀번호를 한 번 더 입력해 주세요.";
  else if (next !== confirm) errors.confirm = "비밀번호가 서로 달라요.";
  return errors;
}

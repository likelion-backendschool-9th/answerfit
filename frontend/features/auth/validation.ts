import { nicknameError, passwordError, photoError } from "@/features/member/validation";
import type { AccountErrors, ProfileErrors } from "./types";

export { nicknameError, passwordError, PHOTO_MAX_BYTES, PHOTO_TYPES, photoError } from "@/features/member/validation";

export function emailError(email: string) {
  if (!email) return "이메일을 입력해 주세요.";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "이메일 형식이 올바르지 않아요.";
}

type Account = { email: string; password: string; passwordConfirm: string; agreed: boolean };

/** 오류가 없는 칸은 넣지 않는다. 빈 객체면 통과다 */
export function validateAccount({ email, password, passwordConfirm, agreed }: Account): AccountErrors {
  const errors: AccountErrors = {};
  const badEmail = emailError(email);
  const badPassword = passwordError(password);
  if (badEmail) errors.email = badEmail;
  if (badPassword) errors.password = badPassword;
  if (!passwordConfirm) errors.passwordConfirm = "비밀번호를 한 번 더 입력해 주세요.";
  else if (password !== passwordConfirm) errors.passwordConfirm = "비밀번호가 서로 달라요.";
  if (!agreed) errors.agreements = "필수 항목에 모두 동의해 주세요.";
  return errors;
}

export function validateProfile({ nickname, photo }: { nickname: string; photo: { type: string; size: number } | null }): ProfileErrors {
  const errors: ProfileErrors = {};
  const badNickname = nicknameError(nickname);
  const badPhoto = photo && photoError(photo);
  if (badNickname) errors.nickname = badNickname;
  if (badPhoto) errors.photo = badPhoto;
  return errors;
}

export const hasErrors = (errors: object) => Object.keys(errors).length > 0;

import { describe, expect, it } from "vitest";
import { emailError, nicknameError, passwordError, PHOTO_MAX_BYTES, photoError, validateAccount, validateProfile } from "@/features/auth/validation";

it.each([
  ["jiwoo@answerfit.kr", true],
  ["", false],
  ["jiwoo", false],
  ["jiwoo@answerfit", false],
  ["ji woo@answerfit.kr", false],
  [`${"a".repeat(250)}@a.kr`, false],
])("이메일 %s → %s", (email, ok) => {
  expect(emailError(email) === undefined).toBe(ok);
});

it.each([
  ["abcdefg1", true],
  ["abcdef1", false],
  ["abcdefgh", false],
  ["12345678", false],
  ["", false],
])("비밀번호 %s → %s", (password, ok) => {
  expect(passwordError(password) === undefined).toBe(ok);
});

it.each([
  ["지", false],
  ["지우", true],
  ["가".repeat(12), true],
  ["가".repeat(13), false],
])("닉네임 %s → %s", (nickname, ok) => {
  expect(nicknameError(nickname) === undefined).toBe(ok);
});

it.each([
  [{ type: "image/png", size: PHOTO_MAX_BYTES }, true],
  [{ type: "image/jpeg", size: 1 }, true],
  [{ type: "image/png", size: PHOTO_MAX_BYTES + 1 }, false],
  [{ type: "image/gif", size: 1 }, false],
])("사진 %j → %s", (photo, ok) => {
  expect(photoError(photo) === undefined).toBe(ok);
});

describe("validateAccount", () => {
  const valid = { email: "jiwoo@answerfit.kr", password: "answerfit1", passwordConfirm: "answerfit1", agreed: true };
  it("모두 맞으면 오류가 없다", () => expect(validateAccount(valid)).toEqual({}));
  it("비밀번호 확인이 다르면 그 칸에만 오류가 난다", () => {
    expect(Object.keys(validateAccount({ ...valid, passwordConfirm: "answerfit2" }))).toEqual(["passwordConfirm"]);
  });
  it("필수 동의를 빼면 막는다", () => {
    expect(Object.keys(validateAccount({ ...valid, agreed: false }))).toEqual(["agreements"]);
  });
});

it("기본 로고를 쓰면 사진을 검사하지 않는다", () => {
  expect(validateProfile({ nickname: "지우", photo: null })).toEqual({});
});

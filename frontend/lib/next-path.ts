/** 로그인 뒤 돌아갈 주소. 우리 사이트 안의 경로만 받고 나머지는 홈으로 보낸다 */
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/")) return "/";
  if (value.startsWith("//") || /[\\\s\u0000-\u001f]/.test(value)) return "/";
  return value;
}

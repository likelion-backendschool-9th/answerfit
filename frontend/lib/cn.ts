/** 값이 있는 클래스 이름만 잇는다 */
export function cn(...names: (string | false | null | undefined)[]) {
  return names.filter(Boolean).join(" ");
}

/** 보여 줄 쪽 번호. 건너뛴 자리는 null이다. 예: 1 2 3 … 42 */
export function pageNumbers(page: number, pages: number): (number | null)[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const near = new Set([1, pages, page - 1, page, page + 1, ...(page <= 2 ? [2, 3] : []), ...(page >= pages - 1 ? [pages - 1, pages - 2] : [])]);
  const shown = [...near].filter((number) => number >= 1 && number <= pages).sort((a, b) => a - b);
  return shown.flatMap((number, i) => (i > 0 && number - shown[i - 1] > 1 ? [null, number] : [number]));
}

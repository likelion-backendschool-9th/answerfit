import type { ArchiveQuestion, QuestionInput, QuestionKind, ReportInput } from "./types";

export const CS_CATEGORIES = ["운영체제", "네트워크", "데이터베이스", "자료구조", "알고리즘", "웹"];
export const KIND_LABEL: Record<QuestionKind, string> = { cs: "CS", personality: "인성 면접" };
export const REPORT_REASONS = ["질문 내용이 사실과 달라요", "모범답안이 틀렸어요", "이미 있는 질문과 중복돼요", "부적절한 표현이 있어요", "기타"];
const REPORT_REASON_CODES = ["WRONG_QUESTION", "WRONG_ANSWER", "DUPLICATE", "INAPPROPRIATE", "ETC"] as const;
export const reportReasonType = (reason: string) => REPORT_REASON_CODES[REPORT_REASONS.indexOf(reason)] ?? null;
export const TEXT_MIN = 10;
export const TEXT_MAX = 200;
export const DETAIL_MAX = 300;
export const PAGE_SIZE = 7;

export const SORTS = { latest: "최신순", likes: "좋아요순" } as const;
export type Sort = keyof typeof SORTS;

export type ArchiveQuery = { kind: QuestionKind; category: string | null; keyword: string; likedOnly: boolean; sort: Sort; page: number };
type Params = Record<string, string | string[] | undefined>;

/** 주소의 값을 읽는다. 잘못된 값은 기본값으로 둔다 */
export function readQuery(params: Params): ArchiveQuery {
  const one = (name: string) => (typeof params[name] === "string" ? params[name] : "");
  const page = Number(one("page"));
  return {
    kind: one("kind") === "personality" ? "personality" : "cs",
    category: one("category") || null,
    keyword: [...one("q").trim()].slice(0, 100).join(""),
    likedOnly: one("liked") === "1",
    sort: one("sort") === "likes" ? "likes" : "latest",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** 바꾼 값으로 목록 주소를 만든다. 조건을 바꾸면 첫 쪽으로 간다 */
export function archiveHref(query: ArchiveQuery, change: Partial<ArchiveQuery> = {}) {
  const next = { ...query, page: 1, ...change };
  const params = new URLSearchParams();
  if (next.kind !== "cs") params.set("kind", next.kind);
  if (next.category) params.set("category", next.category);
  if (next.keyword) params.set("q", next.keyword);
  if (next.likedOnly) params.set("liked", "1");
  if (next.sort !== "latest") params.set("sort", next.sort);
  if (next.page > 1) params.set("page", String(next.page));
  const text = params.toString();
  return text ? `/archive?${text}` : "/archive";
}

const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, "");

/** 최신순은 받은 순서를 그대로 쓴다 */
export function searchQuestions(questions: ArchiveQuestion[], query: ArchiveQuery) {
  const keyword = normalize(query.keyword);
  const found = questions.filter(
    ({ kind, category, text, liked }) =>
      kind === query.kind && (!query.category || category === query.category) && (!query.likedOnly || liked) && (!keyword || normalize(text).includes(keyword)),
  );
  if (query.sort === "likes") found.sort((a, b) => b.likes - a.likes);
  const pages = Math.max(1, Math.ceil(found.length / PAGE_SIZE));
  const page = Math.min(query.page, pages);
  return { items: found.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: found.length, page, pages };
}

/** 분야별 개수. 처음 나온 순서를 지킨다 */
export function countByCategory(questions: ArchiveQuestion[], kind: QuestionKind) {
  const counts = new Map<string, number>(kind === "cs" ? CS_CATEGORIES.map((name) => [name, 0]) : []);
  for (const question of questions) if (question.kind === kind) counts.set(question.category, (counts.get(question.category) ?? 0) + 1);
  return [...counts];
}

/** 같은 분야 안의 앞뒤 질문 */
export function neighbors(questions: ArchiveQuestion[], current: ArchiveQuestion) {
  const same = questions.filter(({ kind, category }) => kind === current.kind && category === current.category);
  const index = same.findIndex(({ id }) => id === current.id);
  return { previous: same[index - 1] ?? null, next: index < 0 ? null : (same[index + 1] ?? null) };
}

const length = (text: string) => [...text].length;

export function questionError({ categoryId, text }: QuestionInput): string | undefined {
  if (!categoryId.trim()) return "카테고리를 골라 주세요.";
  if (length(text) < TEXT_MIN) return `질문을 ${TEXT_MIN}자 이상 써 주세요.`;
  if (length(text) > TEXT_MAX) return `질문은 ${TEXT_MAX}자까지 쓸 수 있어요.`;
}

export function reportError({ reason, detail }: Pick<ReportInput, "reason" | "detail">): string | undefined {
  if (!REPORT_REASONS.includes(reason)) return "신고 사유를 골라 주세요.";
  if (length(detail) > DETAIL_MAX) return `자세한 내용은 ${DETAIL_MAX}자까지 쓸 수 있어요.`;
}

/** 어느 질문에나 있어 비교에 도움이 안 되는 말 */
const COMMON = /설명해|말씀해|말해|주세요|무엇|어떻게|어떤|각각|다른가요|인가요|이유|차이/g;

/** 두 글자씩 자른 조각 */
function pieces(text: string) {
  const plain = [...text.toLowerCase().replace(/\s+/g, "").replace(COMMON, "").replace(/[^0-9a-z가-힣]/g, "")];
  return new Set(plain.slice(1).map((letter, i) => plain[i] + letter));
}

const SIMILAR_AT = 0.35;
const ENOUGH_PIECES = 4;

export const SIMILAR_CANDIDATE_LIMIT = 20;

/** 기존 부분 검색으로 후보를 좁힌 뒤 전체 질문의 유사도를 비교한다. */
export function similarityKeyword(text: string): string | null {
  const input = [...text.trim()].slice(0, TEXT_MAX).join("");
  if ([...input].length < ENOUGH_PIECES) return null;
  const tokens = input.replace(COMMON, " ").split(/[^0-9a-z가-힣]+/i)
    .map((token) => token.replace(/(?:에서|으로|와|과|은|는|이|가|을|를|의)$/u, ""))
    .filter((token) => [...token].length >= 2);
  const best = tokens.reduce((chosen, token) => [...token].length > [...chosen].length ? token : chosen, "");
  return best ? [...best].slice(0, 100).join("") : null;
}

/** 조각이 가장 많이 겹치는 질문. 짧은 쪽의 조각이 3분의 1 넘게 겹쳐야 비슷하다고 본다 */
export function findSimilar<T extends { text: string }>(questions: T[], text: string): T | null {
  const mine = pieces(text);
  if (mine.size < ENOUGH_PIECES) return null;
  let best: { question: T; score: number } | null = null;
  for (const question of questions) {
    const theirs = pieces(question.text);
    const shared = [...mine].filter((piece) => theirs.has(piece)).length;
    const score = shared / Math.max(1, Math.min(mine.size, theirs.size));
    if (score >= SIMILAR_AT && score > (best?.score ?? 0)) best = { question, score };
  }
  return best?.question ?? null;
}

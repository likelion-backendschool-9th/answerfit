import { addDays, daysUntil, startedLabel } from "@/features/interview/result";
import { CS_CATEGORIES, REPORT_REASONS, TEXT_MAX } from "@/features/question/rules";
import type { QuestionKind } from "@/features/question/types";
import type { AdminMember, BankQuestion, LoginProvider, QuestionDraft, ReportedQuestion, ReportEntry } from "./types";

type Params = Record<string, string | string[] | undefined>;
const one = (params: Params, name: string) => (typeof params[name] === "string" ? params[name] : "");
const pageOf = (params: Params) => {
  const page = Number(one(params, "page"));
  return Number.isInteger(page) && page > 0 ? page : 1;
};
const href = (path: string, values: Record<string, string | number | null | undefined>) => {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(values)) if (value) params.set(name, String(value));
  const text = params.toString();
  return text ? `${path}?${text}` : path;
};

function paginate<T>(items: T[], page: number, size: number) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(page, pages);
  const start = (current - 1) * size;
  const shown = items.slice(start, start + size);
  return { items: shown, total: items.length, page: current, pages, from: shown.length === 0 ? 0 : start + 1, to: start + shown.length };
}

// ---------- 문제 은행 ----------
export const PERSONALITY_CATEGORIES = ["협업", "성장", "지원 동기", "문제 해결"];
export const BANK_PAGE_SIZE = 10;
export const ANSWER_MAX = 2000;
export const KEYWORD_MAX = 20;
export const KEYWORD_COUNT = 10;

export const TABS = ["bank", "pending", "reports"] as const;
export type Tab = (typeof TABS)[number];
export const readTab = (params: Params): Tab => TABS.find((tab) => tab === one(params, "tab")) ?? "bank";

export const tabHref = (tab: Tab) => href("/admin/questions", { tab: tab === "bank" ? null : tab });

export type BankQuery = { kind: QuestionKind | null; category: string | null; keyword: string; page: number };

export function readBankQuery(params: Params): BankQuery {
  const kind = one(params, "kind");
  return { kind: kind === "cs" || kind === "personality" ? kind : null, category: one(params, "category") || null, keyword: one(params, "q").trim().slice(0, 100), page: pageOf(params) };
}

export function bankHref(query: BankQuery, change: Partial<BankQuery> = {}) {
  const next = { ...query, page: 1, ...change };
  return href("/admin/questions", { kind: next.kind, category: next.category, q: next.keyword, page: next.page > 1 ? next.page : null });
}

/** 질문 내용이나 ID로 찾는다 */
export function searchBank(questions: BankQuestion[], query: BankQuery) {
  const keyword = query.keyword.toLowerCase();
  const found = questions.filter(
    ({ kind, category, text, code }) =>
      (!query.kind || kind === query.kind) && (!query.category || category === query.category) && (text.toLowerCase().includes(keyword) || code.toLowerCase().includes(keyword)),
  );
  return paginate(found, query.page, BANK_PAGE_SIZE);
}

export type DraftErrors = Partial<Record<"category" | "text" | "answer" | "keywords", string>>;
const length = (text: string) => [...text].length;
export const categoriesOf = (kind: QuestionKind) => (kind === "cs" ? CS_CATEGORIES : PERSONALITY_CATEGORIES);

export function draftErrors({ kind, category, text, answer, keywords }: QuestionDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (!categoriesOf(kind).includes(category)) errors.category = "카테고리를 골라 주세요.";
  if (length(text) < 5 || length(text) > TEXT_MAX) errors.text = `질문은 5~${TEXT_MAX}자로 써 주세요.`;
  if (length(answer) < 1 || length(answer) > ANSWER_MAX) errors.answer = `모범답안은 1~${ANSWER_MAX.toLocaleString("ko-KR")}자로 써 주세요.`;
  if (keywords.length > KEYWORD_COUNT || keywords.some((keyword) => length(keyword) < 1 || length(keyword) > KEYWORD_MAX)) errors.keywords = `키워드는 ${KEYWORD_COUNT}개까지, 하나에 ${KEYWORD_MAX}자까지 쓸 수 있어요.`;
  return errors;
}

/** 빈 값과 중복을 뺀다 */
export const cleanDraft = (draft: QuestionDraft): QuestionDraft => ({
  ...draft,
  text: draft.text.trim(),
  answer: draft.answer.trim(),
  keywords: [...new Set(draft.keywords.map((keyword) => keyword.trim()).filter(Boolean))],
});

// ---------- 신고 ----------
/** 패널을 닫은 상태 */
const CLOSED = "none";
export const reportHref = (id: string | null) => href("/admin/questions", { tab: "reports", report: id ?? CLOSED });

/** 고르지 않았으면 처리할 것 가운데 첫 번째를 보여 준다 */
export function pickReport(reports: ReportedQuestion[], selected: string | string[] | undefined) {
  if (selected === CLOSED) return null;
  return reports.find(({ id }) => id === selected) ?? reports.find(({ status }) => status === "waiting") ?? reports[0] ?? null;
}

const SHORT_REASON: Record<string, string> = { "질문 내용이 사실과 달라요": "사실과 다름", "모범답안이 틀렸어요": "모범답안 오류", "이미 있는 질문과 중복돼요": "중복", "부적절한 표현이 있어요": "부적절한 표현", 기타: "기타" };
export const shortReason = (reason: string) => SHORT_REASON[reason] ?? reason;

/** 사유별 개수. 많은 것부터, 같으면 정해진 순서 */
export const countReasons = (entries: ReportEntry[]) =>
  REPORT_REASONS.map((reason) => ({ reason, count: entries.filter((entry) => entry.reason === reason).length }))
    .filter(({ count }) => count > 0)
    .sort((a, b) => b.count - a.count);

// ---------- 회원 ----------
export const MEMBER_PAGE_SIZE = 8;
export const PROVIDER_LABEL: Record<LoginProvider, string> = { local: "로컬", github: "GitHub", kakao: "카카오", google: "구글" };
export const MEMBER_SORTS = { joined: "최근 가입순", seen: "최근 접속순", interviews: "면접 많은 순" } as const;
export type MemberSort = keyof typeof MEMBER_SORTS;
export type MemberStatus = "active" | "suspended";
export type MemberQuery = { status: MemberStatus | null; provider: LoginProvider | null; keyword: string; sort: MemberSort; page: number };

export function readMemberQuery(params: Params): MemberQuery {
  const status = one(params, "status");
  const provider = one(params, "provider");
  const sort = one(params, "sort");
  return {
    status: status === "active" || status === "suspended" ? status : null,
    provider: Object.hasOwn(PROVIDER_LABEL, provider) ? (provider as LoginProvider) : null,
    keyword: one(params, "q").trim().slice(0, 100),
    sort: sort === "seen" || sort === "interviews" ? sort : "joined",
    page: pageOf(params),
  };
}

export function membersHref(query: MemberQuery, change: Partial<MemberQuery> = {}) {
  const next = { ...query, page: 1, ...change };
  return href("/admin/members", { status: next.status, provider: next.provider, q: next.keyword, sort: next.sort === "joined" ? null : next.sort, page: next.page > 1 ? next.page : null });
}

const MEMBER_ORDER: Record<MemberSort, (a: AdminMember, b: AdminMember) => number> = {
  joined: (a, b) => b.joinedOn.localeCompare(a.joinedOn),
  seen: (a, b) => b.lastSeenOn.localeCompare(a.lastSeenOn),
  interviews: (a, b) => b.interviews - a.interviews,
};

export function searchMembers(members: AdminMember[], query: MemberQuery) {
  const keyword = query.keyword.toLowerCase();
  const found = members
    .filter(
      ({ suspension, provider, email, nickname }) =>
        (!query.status || (query.status === "suspended") === (suspension !== null)) && (!query.provider || provider === query.provider) && (email.toLowerCase().includes(keyword) || nickname.toLowerCase().includes(keyword)),
    )
    .sort(MEMBER_ORDER[query.sort]);
  return paginate(found, query.page, MEMBER_PAGE_SIZE);
}

export const PERIODS = { week: { label: "7일", days: 7 }, month: { label: "30일", days: 30 }, forever: { label: "영구", days: null } } as const;
export type SuspendPeriod = keyof typeof PERIODS;
export const REASON_MAX = 300;

/** 풀리는 날. 그날 0시에 풀린다. 영구면 null */
export function releaseOn(period: SuspendPeriod, today: string) {
  const { days } = PERIODS[period];
  return days === null ? null : addDays(today, days);
}

export function suspendError(period: string, reason: string) {
  if (!Object.hasOwn(PERIODS, period)) return "정지 기간을 골라 주세요.";
  if (length(reason) < 1 || length(reason) > REASON_MAX) return `정지 사유를 1~${REASON_MAX}자로 써 주세요.`;
}

/** 풀리는 날이 되면 정지가 아니다 */
export const isSuspended = (release: string | null, today: string) => release === null || daysUntil(release, today) > 0;

/** 2026-12-02에 풀리면 12.01까지 */
export const suspendedLabel = (release: string | null) => (release ? `정지 · ${addDays(release, -1).slice(5).replace("-", ".")}까지` : "정지 · 영구");

/** 11.24 23:52 */
export const shortTime = (at: string) => startedLabel(at).replace(/^\d{4}\.(\d\d\.\d\d) \(.\) /, "$1 ");

/** 2026.12.02 (수) */
export const dayLabel = (date: string) => startedLabel(`${date}T00:00:00+09:00`).replace(/ \d\d:\d\d$/, "");

export function seenLabel(date: string, today: string) {
  const days = daysUntil(today, date);
  if (days <= 0) return "오늘";
  return days === 1 ? "어제" : date.slice(5).replace("-", ".");
}

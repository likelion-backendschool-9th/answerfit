import { ACTIVITY_TYPES, type ActivityType, type Experience, type Story } from "./types";

export const ACTIVITY_LABEL: Record<ActivityType, string> = { PROJECT: "프로젝트", INTERN: "인턴", PART_TIME: "아르바이트", CLUB: "동아리", CONTEST: "공모전·대회", ETC: "기타" };

/** 공기업은 NCS 직업기초능력 10개, 사기업은 채용 공고에 자주 나오는 역량 10개다 */
export const TAG_GROUPS = {
  공기업: ["의사소통능력", "수리능력", "문제해결능력", "자기개발능력", "자원관리능력", "대인관계능력", "정보능력", "기술능력", "조직이해능력", "직업윤리"],
  사기업: ["도전정신", "책임감", "협업", "리더십", "소통", "창의성", "전문성", "고객지향", "주도성", "분석력"],
} as const;
const PRESET_TAGS: readonly string[] = [...TAG_GROUPS.공기업, ...TAG_GROUPS.사기업];

export const TITLE_MAX = 100;
export const SHORT_MAX = 50;
export const LONG_MAX = 5000;
export const TAG_MAX = 20;
export const TAGS_MAX = 20;
/** 한 경험을 나눠 쓸 수 있는 역량 행 수 */
export const STORIES_MAX = 20;

const tagsOf = (items: Experience[]) => items.flatMap(({ stories }) => stories.flatMap(({ tags }) => tags));

/** 회원이 직접 만든 태그. 쓰인 것만 가나다순으로 */
export function myTags(tags: string[]) {
  return [...new Set(tags)].filter((tag) => !PRESET_TAGS.includes(tag)).sort((a, b) => a.localeCompare(b, "ko"));
}

export const customTags = (items: Experience[]) => myTags(tagsOf(items));

/** 공기업·사기업·내 태그 순서로, 쓰인 태그만 */
export function usedTags(items: Experience[]) {
  const used = new Set(tagsOf(items));
  return [...PRESET_TAGS.filter((tag) => used.has(tag)), ...customTags(items)];
}

export const formatDate = (date: string) => date.replaceAll("-", ".");

/** "2025.03.04 ~ 2025.08.30", 종료일이 없으면 "~ 진행 중". 시작일이 없으면 null */
export function formatPeriod({ startedOn, endedOn }: Pick<Experience, "startedOn" | "endedOn">) {
  if (!startedOn) return null;
  return `${formatDate(startedOn)} ~ ${endedOn ? formatDate(endedOn) : "진행 중"}`;
}

export function titleError(title: string) {
  if (!title.trim()) return "제목을 적어 주세요.";
  if (title.trim().length > TITLE_MAX) return `제목은 ${TITLE_MAX}자까지 적을 수 있어요.`;
  return null;
}

export function periodError(startedOn: string | null, endedOn: string | null) {
  if (endedOn && !startedOn) return "시작일을 먼저 골라 주세요.";
  if (startedOn && endedOn && endedOn < startedOn) return "종료일은 시작일 이후여야 해요.";
  return null;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isDate = (value: unknown): value is string => typeof value === "string" && DATE.test(value) && !Number.isNaN(Date.parse(value));
const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const isId = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 64;
const cleanTags = (tags: string[]) => [...new Set(tags.map((tag) => tag.trim().slice(0, TAG_MAX)).filter(Boolean))].slice(0, TAGS_MAX);

function toStory(value: unknown): Story | null {
  if (typeof value !== "object" || value === null) return null;
  const input = value as Record<string, unknown>;
  if (!isId(input.id) || !Array.isArray(input.tags) || input.tags.length > TAGS_MAX || !input.tags.every((tag) => typeof tag === "string")) return null;
  return { id: input.id, tags: cleanTags(input.tags as string[]), content: text(input.content, LONG_MAX), result: text(input.result, LONG_MAX) };
}

/** 화면에서 받은 값을 경험으로 고친다. 형식이 틀리면 null(서버 액션의 입구) */
export function toExperience(value: unknown): Experience | null {
  if (typeof value !== "object" || value === null) return null;
  const input = value as Record<string, unknown>;
  if (!isId(input.id) || typeof input.title !== "string") return null;
  if (input.type !== null && !ACTIVITY_TYPES.includes(input.type as ActivityType)) return null;
  if ((input.startedOn !== null && !isDate(input.startedOn)) || (input.endedOn !== null && !isDate(input.endedOn))) return null;
  if (!Array.isArray(input.stories) || input.stories.length === 0 || input.stories.length > STORIES_MAX) return null;
  const stories = input.stories.map(toStory);
  if (stories.some((story) => !story) || new Set(stories.map((story) => story!.id)).size !== stories.length) return null;
  return {
    id: input.id,
    title: input.title.trim(),
    type: input.type as ActivityType | null,
    startedOn: input.startedOn as string | null,
    endedOn: input.endedOn as string | null,
    organization: text(input.organization, SHORT_MAX),
    role: text(input.role, SHORT_MAX),
    stories: stories as Story[],
  };
}

export const experienceError = (experience: Experience) => titleError(experience.title) ?? periodError(experience.startedOn, experience.endedOn);

export const emptyStory = (id: string): Story => ({ id, tags: [], content: "", result: "" });

export const emptyExperience = (id: string, storyId: string): Experience => ({ id, title: "", type: null, startedOn: null, endedOn: null, organization: "", role: "", stories: [emptyStory(storyId)] });

export type ExperienceFilter = { type: ActivityType | null; tag: string; keyword: string };

/**
 * 보이는 경험과 역량 행. 태그를 고르면 그 태그가 달린 역량 행만 남긴다.
 * 돌려준 경험은 서술이 빠져 있을 수 있으니 보여 주는 데만 쓰고 저장하지 않는다.
 */
export function filterExperiences(items: Experience[], { type, tag, keyword }: ExperienceFilter): Experience[] {
  const word = keyword.trim().toLowerCase();
  const has = (value: string) => value.toLowerCase().includes(word);
  return items
    .filter((item) => (!type || item.type === type) && (!word || [item.title, item.organization, item.role].some(has) || item.stories.some(({ content, result }) => has(content) || has(result))))
    .map((item) => (tag ? { ...item, stories: item.stories.filter(({ tags }) => tags.includes(tag)) } : item))
    .filter(({ stories }) => stories.length > 0);
}

const LABEL_TO_TYPE = new Map(Object.entries(ACTIVITY_LABEL).map(([type, label]) => [label, type as ActivityType]));

/** 2025.03.04, 2025-03-04, 2025/3/4를 YYYY-MM-DD로. 날짜가 아니면 null */
function readDate(value: string) {
  const match = value.trim().match(/^(\d{4})[.\-/]\s*(\d{1,2})[.\-/]\s*(\d{1,2})\.?$/);
  if (!match) return null;
  const date = `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  return isDate(date) ? date : null;
}

function readPeriod(value: string) {
  const [start = "", end = ""] = value.split("~");
  const startedOn = readDate(start);
  const endedOn = readDate(end);
  return startedOn && !periodError(startedOn, endedOn) ? { startedOn, endedOn } : { startedOn: null, endedOn: null };
}

/**
 * 엑셀·구글 시트에서 복사한 표(탭으로 나눈 줄)를 경험으로 읽는다.
 * 열 순서는 표와 같다: 제목, 구분, 기간, 소속, 역할, 역량 태그(쉼표), 활동 내용, 성과. 첫 줄이 "제목"으로 시작하면 머리글로 보고 건너뛴다.
 * 엑셀에서 병합한 셀을 복사하면 아래 줄의 제목이 비므로, 제목이 빈 줄은 바로 위 경험의 역량 행으로 붙인다. 붙일 경험이 없으면 건너뛰고 그 수를 돌려준다.
 * shortcut: 따옴표로 감싼 셀 안의 줄바꿈은 줄로 나뉜다. 여러 줄 성과를 붙여 넣는 요청이 오면 따옴표를 읽는다.
 */
export function parsePasted(pasted: string, newId: () => string) {
  const lines = pasted.split(/\r?\n/).filter((line) => line.trim());
  if (lines[0]?.split("\t")[0].trim() === "제목") lines.shift();
  const items: Experience[] = [];
  let skipped = 0;
  for (const line of lines) {
    const [title = "", type = "", period = "", organization = "", role = "", tags = "", content = "", result = ""] = line.split("\t").map((cell) => cell.trim());
    const story = { id: newId(), tags: cleanTags(tags.split(",")), content: content.slice(0, LONG_MAX), result: result.slice(0, LONG_MAX) };
    const previous = items.at(-1);
    if (!title.trim() && previous && previous.stories.length < STORIES_MAX) {
      previous.stories.push(story);
      continue;
    }
    if (titleError(title)) {
      skipped += 1;
      continue;
    }
    items.push({
      id: newId(),
      title,
      type: LABEL_TO_TYPE.get(type) ?? null,
      ...readPeriod(period),
      organization: organization.slice(0, SHORT_MAX),
      role: role.slice(0, SHORT_MAX),
      stories: [story],
    });
  }
  return { items, skipped };
}

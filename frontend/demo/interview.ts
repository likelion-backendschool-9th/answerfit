import "server-only";
import { cookies } from "next/headers";
import { KEEP_DAYS, todayInSeoul } from "@/features/interview/setup";
import { addDays, defaultTitle, summarize, mainItems, type InterviewResult, type ResultState } from "@/features/interview/result";
import type { InterviewRecord } from "@/features/interview/records";
import { analysisAt } from "@/features/interview/analysis";
import type { AnswerInput, Interview, InterviewSetup, Question, RecordType } from "@/features/interview/types";
import { listDemoGroups } from "./documents";
import { demoRecords, SAMPLE_ID } from "./records";
import { buildItem, recordResult, sampleResult } from "./result";

const COOKIE = "demo-interview";
/** 결과 정리 화면이 보이는 시간 */
const RESULT_MS = 12_000;
/** 분석 화면이 보이도록 잠시 기다린다 */
const ANALYZE_MS = 4500;

type DemoQuestion = Question & { followUp?: string };
const make = (prefix: string, rows: [category: string, text: string, hint: string, followUp?: string][]): DemoQuestion[] =>
  rows.map(([category, text, hint, followUp], i) => ({ id: `${prefix}-${i + 1}`, category, text, hint, followUp }));

const QUESTIONS: Record<InterviewSetup["type"], DemoQuestion[]> = {
  experience: make("exp", [
    ["자기소개 · 지원 동기", "지원 직무에서 가장 자신 있는 역량을 실제 경험과 함께 말씀해 주세요.", "역량 한 가지를 먼저 말하고, 그 역량을 쓴 상황과 결과를 이어서 말해 보세요."],
    ["직무 역량 · 대용량 트래픽 처리", "트래픽이 갑자기 몰렸던 상황에서 서버 장애를 어떻게 해결했는지, 본인의 역할을 중심으로 설명해 주세요.", "병목 지점 파악, 캐시, 오토스케일링, 응답 시간 개선 수치 키워드를 활용하세요. 상황 → 내 역할 → 해결 방법 → 결과 순서로 말해 보세요. 결과는 숫자로 말하면 더 설득력 있어요.", "응답 시간 개선 결과를 숫자로 설명해 주세요."],
    ["협업 · 의견 조율", "팀원과 기술 선택에서 의견이 달랐던 경험과, 어떻게 합의했는지 말씀해 주세요.", "서로의 근거, 판단 기준, 합의한 방법, 그 뒤의 결과를 순서대로 말해 보세요.", "지금 다시 같은 상황이라면 어떤 기준으로 결정하시겠어요?"],
    ["직무 역량 · 데이터 모델링", "프로젝트에서 테이블을 설계할 때 가장 고민한 부분은 무엇이었나요?", "정규화와 조회 성능 사이에서 무엇을 기준으로 골랐는지 말해 보세요."],
    ["문제 해결 · 디버깅", "원인을 찾기 가장 어려웠던 버그와, 찾아낸 과정을 설명해 주세요.", "가설, 확인 방법, 원인, 재발 방지 순서로 말해 보세요.", "같은 문제가 다시 생기지 않게 어떤 장치를 두었나요?"],
    ["품질 · 테스트", "테스트 코드를 작성하면서 설계가 바뀐 경험이 있나요?", "무엇이 테스트하기 어려웠고, 구조를 어떻게 바꿨는지 말해 보세요."],
    ["성장 · 학습", "최근에 새로 배운 기술을 프로젝트에 적용한 과정을 말씀해 주세요.", "왜 필요했는지, 어떻게 검증했는지 말해 보세요."],
    ["마무리 · 회고", "프로젝트를 다시 한다면 가장 먼저 바꾸고 싶은 부분은 무엇인가요?", "아쉬운 점과 바꿀 방법, 예상되는 효과를 말해 보세요."],
  ]),
  cs: make("cs", [
    ["데이터베이스 · 트랜잭션", "트랜잭션 격리 수준을 설명해 주세요.", "네 가지 격리 수준과 각 수준에서 생기는 이상 현상을 짝지어 말해 보세요.", "Phantom Read가 생기는 상황을 예로 들어 설명해 주세요."],
    ["네트워크 · TCP", "TCP의 3-way handshake 과정을 설명해 주세요.", "SYN, SYN-ACK, ACK와 각 단계에서 확인하는 것을 말해 보세요.", "연결을 끊을 때는 왜 네 단계가 필요한가요?"],
    ["운영체제 · 프로세스", "프로세스와 스레드의 차이를 설명해 주세요.", "메모리 공유 범위와 컨텍스트 스위칭 비용을 비교해 보세요."],
    ["데이터베이스 · 인덱스", "인덱스를 쓰면 조회가 빨라지는 이유와 단점을 설명해 주세요.", "B+Tree 구조와 쓰기 비용을 함께 말해 보세요.", "인덱스가 있어도 쓰이지 않는 경우를 말씀해 주세요."],
    ["네트워크 · HTTP", "HTTP와 HTTPS의 차이를 설명해 주세요.", "TLS가 보장하는 세 가지를 말해 보세요."],
    ["운영체제 · 동기화", "데드락이 생기는 네 가지 조건을 설명해 주세요.", "상호 배제, 점유 대기, 비선점, 순환 대기를 말해 보세요."],
    ["자료구조 · 해시", "해시 충돌을 해결하는 방법을 설명해 주세요.", "체이닝과 개방 주소법을 비교해 보세요."],
    ["Java · JVM", "가비지 컬렉션이 동작하는 과정을 설명해 주세요.", "Young, Old 영역과 Stop-the-world를 말해 보세요."],
  ]),
  personality: make("per", [
    ["협업 · 갈등", "팀원과 의견이 달랐던 경험과 해결 과정을 말씀해 주세요.", "갈등의 원인, 내가 한 행동, 결과를 순서대로 말해 보세요.", "그때 다르게 행동했다면 결과가 어떻게 달라졌을까요?"],
    ["성장 · 실패", "가장 크게 실패한 경험과 그 뒤에 바꾼 점을 말씀해 주세요.", "실패의 원인을 남 탓 없이 말하고, 바꾼 습관을 구체적으로 말해 보세요."],
    ["지원 동기", "우리 회사에 지원한 까닭을 말씀해 주세요.", "회사의 서비스나 문화에서 끌린 점과 내 경험을 이어서 말해 보세요."],
    ["문제 해결 · 우선순위", "할 일이 한꺼번에 몰렸을 때 어떻게 순서를 정하나요?", "판단 기준과 실제로 적용한 예를 함께 말해 보세요."],
    ["가치관 · 일하는 방식", "함께 일하고 싶은 동료는 어떤 사람인가요?", "그렇게 생각하게 된 경험을 한 가지 붙여 보세요."],
    ["컬쳐핏 · 피드백", "받아들이기 어려웠던 피드백과 그 뒤의 행동을 말씀해 주세요.", "처음 든 생각, 받아들인 과정, 바뀐 결과를 말해 보세요.", "반대로 동료에게 어려운 피드백을 준 적이 있나요?"],
    ["책임감 · 마감", "마감을 지키기 어려웠던 상황에서 어떻게 대응했나요?", "공유한 시점과 대안, 결과를 말해 보세요."],
    ["마무리 · 목표", "입사 후 1년 동안 이루고 싶은 목표를 말씀해 주세요.", "측정할 수 있는 목표와 이유를 함께 말해 보세요."],
  ]),
  pt: make("pt", [
    ["발표 · 기사 요약", "고른 IT 기사의 핵심을 1분 안에 요약해 주세요.", "기사의 사실, 쟁점, 나의 관점을 한 문장씩 말해 보세요."],
    ["발표 · 기술 분석", "기사에 나온 기술이 우리 서비스에 줄 수 있는 영향을 발표해 주세요.", "장점, 위험, 도입 조건을 나눠서 말해 보세요.", "도입하지 말아야 하는 경우는 언제일까요?"],
    ["질의 · 근거", "발표에서 주장한 내용의 근거를 더 설명해 주세요.", "수치나 사례를 하나 이상 들어 보세요."],
    ["질의 · 반론", "반대 의견을 가진 팀원을 어떻게 설득하시겠어요?", "상대의 우려를 먼저 인정하고 대안을 말해 보세요.", "설득에 실패하면 어떻게 하시겠어요?"],
    ["질의 · 실행 계획", "제안한 내용을 3개월 안에 실행한다면 어떤 순서로 하시겠어요?", "단계별 목표와 확인 지표를 말해 보세요."],
    ["질의 · 위험 관리", "실행 중 가장 걱정되는 위험과 대비책은 무엇인가요?", "위험이 생겼을 때 알아챌 방법도 말해 보세요."],
    ["질의 · 비용", "이 제안에 드는 비용과 얻는 효과를 비교해 주세요.", "정확한 숫자가 없으면 가정을 먼저 밝히세요."],
    ["마무리 · 요약", "발표 내용을 30초로 다시 요약해 주세요.", "결론부터 말하고 근거를 두 가지만 붙여 보세요."],
  ]),
};

const questionsOf = (type: RecordType) => QUESTIONS[type];

const open = ({ id, category, text, hint }: Question): Question => ({ id, category, text, hint });

/** 마지막 면접 하나만 쿠키에 남긴다 */
type Saved = {
  id: string;
  mode: InterviewSetup["mode"];
  type: InterviewSetup["type"];
  count: number;
  groupId: string | null;
  deleteAfter: string | null;
  startedAt: string;
  finishedAt: number | null;
  title: string | null;
  /** [질문 id, 답변 시간(초)] */
  answers: [string, number][];
};

async function read(id: string): Promise<Saved | null> {
  try {
    const saved = JSON.parse((await cookies()).get(COOKIE)?.value ?? "null") as Partial<Saved> | null;
    if (!saved || saved.id !== id || !saved.type || !(saved.type in QUESTIONS)) return null;
    return {
      id,
      mode: saved.mode === "real" ? "real" : "practice",
      type: saved.type,
      count: Number(saved.count) || 0,
      groupId: saved.groupId ?? null,
      deleteAfter: saved.deleteAfter ?? null,
      startedAt: saved.startedAt ?? new Date().toISOString(),
      finishedAt: saved.finishedAt ?? null,
      title: saved.title ?? null,
      answers: Array.isArray(saved.answers) ? saved.answers : [],
    };
  } catch {
    return null;
  }
}

async function write(saved: Saved) {
  (await cookies()).set(COOKIE, JSON.stringify(saved), { path: "/", sameSite: "lax", httpOnly: true });
}

export async function createDemoInterview({ mode, type, count, groupId, deleteAfter }: InterviewSetup) {
  const id = `demo-${Date.now().toString(36)}`;
  await write({ id, mode, type, count, groupId, deleteAfter, startedAt: new Date().toISOString(), finishedAt: null, title: null, answers: [] });
  return id;
}

export async function findDemoInterview(id: string): Promise<Interview | null> {
  const saved = await read(id);
  if (!saved) return null;
  const questions = QUESTIONS[saved.type].slice(0, saved.count).map(open);
  return questions.length > 0 ? { id, mode: saved.mode, type: saved.type, questions } : null;
}

const followUpOf = ({ id, category, followUp }: DemoQuestion): Question | null =>
  followUp ? { id: `${id}-follow`, category, text: followUp, hint: "앞의 답변에서 빠진 근거를 한 가지 더해 짧게 말해 보세요." } : null;

export async function analyzeDemoAnswer({ interviewId, questionId, seconds }: AnswerInput): Promise<Question | null> {
  await new Promise((resolve) => setTimeout(resolve, ANALYZE_MS));
  const saved = await read(interviewId);
  if (!saved) return null;
  // 다시 분석하면 앞의 답변을 바꾼다
  const answers = saved.answers.filter(([id]) => id !== questionId);
  await write({ ...saved, answers: [...answers, [questionId, seconds]] });
  const question = QUESTIONS[saved.type].find(({ id }) => id === questionId);
  return question ? followUpOf(question) : null;
}

export async function finishDemoInterview(id: string) {
  const saved = await read(id);
  if (saved && saved.answers.length > 0 && !saved.finishedAt) await write({ ...saved, finishedAt: Date.now() });
}

const percentOf = ({ finishedAt }: Saved) => (finishedAt ? ((Date.now() - finishedAt) / RESULT_MS) * 100 : 0);

export async function demoProgress(id: string) {
  const saved = await read(id);
  return saved?.finishedAt ? analysisAt(percentOf(saved), saved.answers.length) : null;
}

async function groupNames() {
  return new Map((await listDemoGroups()).map(({ id, name }) => [id, name]));
}

function toResult(saved: Saved, names: Map<string, string>): InterviewResult {
  const started = todayInSeoul(new Date(saved.startedAt));
  const seconds = new Map(saved.answers);
  const items = QUESTIONS[saved.type].slice(0, saved.count).flatMap((question, index) => {
    const followUp = followUpOf(question);
    const rows = [{ question: open(question), parentId: null as string | null, label: `Q${index + 1}` }];
    if (followUp) rows.push({ question: followUp, parentId: question.id, label: `Q${index + 1}-1` });
    return rows.filter((row) => seconds.has(row.question.id)).map((row) => buildItem({ ...row, seconds: seconds.get(row.question.id) ?? 0 }));
  });
  return {
    id: saved.id,
    title: saved.title ?? defaultTitle(saved.startedAt),
    mode: saved.mode,
    type: saved.type,
    groupId: saved.groupId,
    groupName: (saved.groupId && names.get(saved.groupId)) || null,
    startedAt: saved.startedAt,
    deleteAfter: saved.deleteAfter ?? addDays(started, KEEP_DAYS),
    items,
  };
}

export async function findDemoResult(id: string): Promise<ResultState | null> {
  const names = await groupNames();
  if (id === SAMPLE_ID) return { state: "done", result: sampleResult(names.get("webtoon") ?? null) };
  const record = demoRecords(names).find((one) => one.id === id);
  if (record) return { state: "done", result: recordResult(record, questionsOf(record.type).map(open)) };
  const saved = await read(id);
  if (!saved) return null;
  if (!saved.finishedAt) return { state: "inProgress" };
  return percentOf(saved) >= 100 ? { state: "done", result: toResult(saved, names) } : { state: "analyzing" };
}

/** 예시 결과의 제목은 바꾸지 않는다 */
export async function renameDemoInterview(id: string, title: string) {
  const saved = await read(id);
  if (saved) await write({ ...saved, title });
  return saved !== null;
}

/** 방금 끝난 면접이 있으면 맨 앞에 붙인다 */
export async function listDemoRecords(): Promise<InterviewRecord[]> {
  const names = await groupNames();
  const records = demoRecords(names);
  const raw = (await cookies()).get(COOKIE)?.value;
  let id: unknown;
  try {
    id = JSON.parse(raw ?? "null")?.id;
  } catch {
    return records;
  }
  const saved = typeof id === "string" ? await read(id) : null;
  if (!saved?.finishedAt || percentOf(saved) < 100) return records;
  const result = toResult(saved, names);
  if (result.items.length === 0) return records;
  const { title, type, mode, groupId, groupName, startedAt, deleteAfter, items } = result;
  return [{ id: result.id, title, type, mode, count: mainItems(items).length, score: summarize(items).score, groupId, groupName, startedAt, deleteAfter }, ...records];
}

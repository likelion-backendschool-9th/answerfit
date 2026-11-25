import "server-only";
import type { InterviewRecord } from "@/features/interview/records";
import { defaultTitle, type InterviewResult, type ResultItem } from "@/features/interview/result";
import type { Question } from "@/features/interview/types";
import { demoDate, demoTime } from "./clock";
import { SAMPLE_ID } from "./records";

const NO_TRANSCRIPT = "시연용 결과라 실제로 말한 내용은 들어 있지 않아요. 음성 인식을 연동하면 이 자리에 답변이 나와요.";

const TRAFFIC = {
  comment: "캐시 도입과 오토스케일링으로 장애를 해결한 흐름이 분명하고, 본인의 역할도 잘 드러났어요. 다만 병목 지점을 어떻게 찾았는지와 개선 결과를 숫자로 말하지 않아 설득력이 조금 약했어요.",
  keywords: ["APM으로 병목 찾기", "Redis 캐시 전략", "DB 커넥션 풀", "부하 테스트"],
  tip: "\"평균 응답 시간이 1.2초에서 0.3초로 줄었다\"처럼 전후 수치를 한 문장으로 붙이면, 같은 경험도 훨씬 구체적으로 들려요.",
};

type Scores = { score: number; accuracy: number; gaze: number };
const SCORES: Scores[] = [
  { score: 84, accuracy: 90, gaze: 60 },
  { score: 78, accuracy: 82, gaze: 56 },
  { score: 74, accuracy: 79, gaze: 54 },
  { score: 81, accuracy: 88, gaze: 58 },
  { score: 69, accuracy: 72, gaze: 60 },
  { score: 75, accuracy: 79, gaze: 56 },
  { score: 86, accuracy: 93, gaze: 62 },
];

const accuracyNote = (accuracy: number) => `핵심 키워드 6개 중 ${Math.max(1, Math.round((accuracy / 100) * 6 - 0.6))}개를 말했어요`;
const gazeNote = (gaze: number) => (gaze >= 60 ? "대체로 정면을 바라봤어요" : "답변 후반 30초 동안 화면 아래를 보는 시간이 길었어요");

function hash(text: string) {
  return [...text].reduce((sum, letter) => (sum * 31 + letter.charCodeAt(0)) % 1_000_003, 7);
}

type Row = { question: Question; label: string; parentId: string | null; seconds: number };

/** 시연 면접의 결과. 점수는 질문마다 정해져 있고 답변 시간만 실제 값이다 */
export function buildItem({ question, label, parentId, seconds }: Row): ResultItem {
  const scores = SCORES[hash(question.id) % SCORES.length];
  const topic = question.category.split("·").pop()?.trim() ?? question.category;
  const detail = question.id === "exp-2" ? TRAFFIC : null;
  return {
    id: question.id,
    label,
    parentId,
    category: question.category,
    title: parentId ? question.text : topic,
    text: question.text,
    ...scores,
    accuracyNote: accuracyNote(scores.accuracy),
    gazeNote: gazeNote(scores.gaze),
    seconds,
    reviewNote: "근거와 결과를 더 말해 보세요",
    comment: detail?.comment ?? `${topic}에 대해 핵심을 짚어 답했어요. 다만 판단한 근거와 결과를 구체적인 예로 들지 않아 설득력이 조금 약했어요.`,
    keywords: detail?.keywords ?? [topic, "근거와 예시", "결과 수치화"],
    tip: detail?.tip ?? "결론을 먼저 한 문장으로 말하고, 근거와 예시를 하나씩 붙이면 듣는 사람이 따라오기 쉬워요.",
    transcript: NO_TRANSCRIPT,
  };
}

const sample = (index: number, label: string, parentId: string | null, title: string, category: string, text: string, seconds: number, rest: Partial<ResultItem> = {}): ResultItem => ({
  ...buildItem({ question: { id: `sample-${label}`, category, text, hint: "" }, label, parentId, seconds }),
  ...SCORES[index],
  accuracyNote: accuracyNote(SCORES[index].accuracy),
  gazeNote: gazeNote(SCORES[index].gaze),
  title,
  ...rest,
});

const SAMPLE_ITEMS: ResultItem[] = [
  sample(0, "Q1", null, "지원 직무를 고른 이유", "자기소개 · 지원 동기", "지원 직무를 고른 이유와 준비한 과정을 말씀해 주세요.", 105),
  sample(1, "Q2", null, "트래픽 급증 장애 해결 경험", "직무 역량 · 대용량 트래픽 처리", "트래픽이 갑자기 몰렸던 상황에서 서버 장애를 어떻게 해결했는지, 본인의 역할을 중심으로 설명해 주세요.", 112, {
    ...TRAFFIC,
    accuracyNote: "핵심 키워드 6개 중 4개를 말했어요",
    transcript:
      "작년 학교 축제 예매 서비스를 운영할 때 오픈 직후 접속자가 평소의 열 배 정도로 몰리면서 API 응답이 크게 느려졌습니다. 저는 백엔드 담당으로 먼저 조회가 많은 공연 목록 API에 Redis 캐시를 붙였고, 서버는 오토스케일링 그룹으로 옮겨서 트래픽에 따라 늘어나게 했습니다. 그 뒤로는 같은 상황에서도 서비스가 멈추지 않았습니다.",
  }),
  sample(2, "Q2-1", "sample-Q2", "응답 시간 개선 결과", "직무 역량 · 대용량 트래픽 처리", "응답 시간 개선 결과를 숫자로 설명해 주세요.", 98, { reviewNote: "결과 수치가 빠졌어요" }),
  sample(3, "Q3", null, "기술 의견이 갈렸던 경험", "협업 · 의견 조율", "팀원과 기술적 의견이 갈렸던 경험을 말씀해 주세요.", 126),
  sample(4, "Q4", null, "가장 어려웠던 버그 해결", "문제 해결 · 디버깅", "가장 어려웠던 버그와 해결 과정을 설명해 주세요.", 131, { reviewNote: "원인을 찾은 근거가 부족해요" }),
  sample(5, "Q4-1", "sample-Q4", "같은 문제를 막기 위해 바꾼 점", "문제 해결 · 디버깅", "같은 문제를 막기 위해 바꾼 점을 말씀해 주세요.", 94, { reviewNote: "재발 방지 방법을 더 말해 보세요" }),
  sample(6, "Q5", null, "입사 후 1년 목표", "마무리 · 목표", "입사 후 1년 동안 이루고 싶은 목표를 말씀해 주세요.", 118),
  ];

/** 목업에 있는 결과. 면접을 보지 않아도 /interviews/demo-sample/result에서 볼 수 있다 */
export function sampleResult(groupName: string | null): InterviewResult {
  const startedAt = demoTime("2026-11-24", "23:10");
  return {
    id: SAMPLE_ID,
    title: defaultTitle(startedAt),
    mode: "practice",
    type: "experience",
    groupId: groupName ? "webtoon" : null,
    groupName,
    startedAt,
    deleteAfter: demoDate("2026-12-10"),
    items: SAMPLE_ITEMS,
  };
}

/** 평균이 기록의 점수와 같아지도록 앞뒤 질문의 점수를 같은 폭으로 올리고 내린다 */
function spread(count: number, index: number) {
  if (count % 2 === 1 && index === count - 1) return 0;
  return index % 2 === 0 ? 4 : -4;
}

/** 지난 기록의 결과. 질문은 그 유형의 문제 은행에서 가져온다 */
export function recordResult(record: InterviewRecord, questions: Question[]): InterviewResult {
  const { id, title, mode, type, groupId, groupName, startedAt, deleteAfter, score } = record;
  const items = questions.slice(0, record.count).map((question, index, list) => {
    const item = buildItem({ question, label: `Q${index + 1}`, parentId: null, seconds: 90 + ((index * 17) % 50) });
    const own = score + spread(list.length, index);
    return { ...item, score: own, accuracy: Math.min(100, own + 4), accuracyNote: accuracyNote(Math.min(100, own + 4)) };
  });
  return { id, title, mode, type, groupId, groupName, startedAt, deleteAfter, items };
}

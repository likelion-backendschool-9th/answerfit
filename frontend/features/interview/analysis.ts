/** 면접이 끝난 뒤 결과를 정리하는 네 단계 */
export const ANALYSIS_STEPS = [
  { title: "답변 내용 평가", doing: "모범답안의 핵심 키워드와 비교하고 있어요", done: "모범답안의 핵심 키워드와 비교했어요", waiting: "모범답안의 핵심 키워드와 비교해요" },
  { title: "시선 · 답변 시간 정리", doing: "정면 응시 비율과 답변 길이를 계산하고 있어요", done: "정면 응시 비율과 답변 길이를 계산했어요", waiting: "정면 응시 비율과 답변 길이를 계산해요" },
  { title: "질문별 코멘트 작성", doing: "총평 · 심화 학습 키워드 · 면접관 팁을 쓰고 있어요", done: "총평 · 심화 학습 키워드 · 면접관 팁을 썼어요", waiting: "총평 · 심화 학습 키워드 · 면접관 팁을 써요" },
  { title: "종합 리포트 만들기", doing: "수치 요약과 영상을 질문별로 묶고 있어요", done: "수치 요약과 영상을 질문별로 묶었어요", waiting: "수치 요약과 영상을 질문별로 묶어요" },
];
/** 단계가 끝나는 비율(%) */
const STEP_ENDS = [20, 40, 80, 100];
export const COMMENT_STEP = 2;

export type AnalysisProgress = { percent: number; step: number; total: number; commented: number; done: boolean };

/** 비율을 단계와 코멘트 개수로 바꾼다 */
export function analysisAt(rawPercent: number, total: number): AnalysisProgress {
  const percent = Math.max(0, Math.min(100, Math.floor(rawPercent)));
  const done = percent === 100;
  const step = done ? STEP_ENDS.length : STEP_ENDS.findIndex((end) => percent < end);
  const from = STEP_ENDS[COMMENT_STEP - 1];
  const ratio = (percent - from) / (STEP_ENDS[COMMENT_STEP] - from);
  return { percent, step, total, commented: Math.max(0, Math.min(total, Math.ceil(ratio * total))), done };
}

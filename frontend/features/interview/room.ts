import type { Interview, InterviewMode, Question } from "./types";

/** 실전 모드의 답변 제한 시간(초) */
export const REAL_LIMIT_SECONDS = 120;

export type Phase = "listening" | "answering" | "analyzing" | "choosing" | "finished";

export type RoomState = {
  mode: InterviewMode;
  questions: Question[];
  index: number;
  question: Question;
  isFollowUp: boolean;
  phase: Phase;
  paused: boolean;
  hintOpen: boolean;
  answerSeconds: number;
  totalSeconds: number;
  /** 분석 뒤 고를 수 있는 꼬리 질문 */
  followUp: Question | null;
  error: string | null;
};

export type RoomEvent =
  | { type: "startAnswer" }
  | { type: "replay" }
  | { type: "toggleHint" }
  | { type: "complete" }
  | { type: "analyzed"; followUp: Question | null }
  | { type: "failed"; error: string }
  | { type: "retry" }
  | { type: "next" }
  | { type: "followUp" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "tick" };

export function initRoom({ mode, questions }: Interview): RoomState {
  return {
    mode,
    questions,
    index: 0,
    question: questions[0],
    isFollowUp: false,
    phase: "listening",
    paused: false,
    hintOpen: false,
    answerSeconds: 0,
    totalSeconds: 0,
    followUp: null,
    error: null,
  };
}

const ask = (state: RoomState, question: Question, change: Partial<RoomState>): RoomState => ({
  ...state,
  question,
  phase: "listening",
  hintOpen: false,
  answerSeconds: 0,
  followUp: null,
  error: null,
  ...change,
});

function next(state: RoomState): RoomState {
  const index = state.index + 1;
  if (index >= state.questions.length) return { ...state, phase: "finished", followUp: null, error: null };
  return ask(state, state.questions[index], { index, isFollowUp: false });
}

const followUp = (state: RoomState, question: Question) => ask(state, question, { isFollowUp: true });

/** 지금 단계에서 할 수 없는 일은 무시한다. 멈춘 동안에는 이어서 하기만 받는다 */
export function roomReducer(state: RoomState, event: RoomEvent): RoomState {
  const { phase, paused } = state;
  if (event.type === "resume") return paused ? { ...state, paused: false } : state;
  if (paused) return state;

  switch (event.type) {
    case "startAnswer":
      return phase === "listening" ? { ...state, phase: "answering" } : state;
    case "replay":
      return phase === "answering" ? { ...state, phase: "listening" } : state;
    case "toggleHint":
      return state.mode === "practice" && (phase === "listening" || phase === "answering") ? { ...state, hintOpen: !state.hintOpen } : state;
    case "complete":
      return phase === "answering" ? { ...state, phase: "analyzing", hintOpen: false, error: null } : state;
    case "analyzed": {
      if (phase !== "analyzing") return state;
      // 꼬리 질문에는 다시 꼬리 질문을 붙이지 않는다
      const question = state.isFollowUp ? null : event.followUp;
      if (state.mode === "practice") return { ...state, phase: "choosing", followUp: question };
      return question ? followUp(state, question) : next(state);
    }
    case "failed":
      return phase === "analyzing" ? { ...state, phase: "choosing", followUp: null, error: event.error } : state;
    case "retry":
      return phase === "choosing" && state.error ? { ...state, phase: "analyzing", error: null } : state;
    case "next":
      return phase === "choosing" ? next(state) : state;
    case "followUp":
      return phase === "choosing" && state.followUp ? followUp(state, state.followUp) : state;
    case "pause":
      return phase === "analyzing" || phase === "finished" ? state : { ...state, paused: true };
    case "tick": {
      if (phase !== "listening" && phase !== "answering") return state;
      const ticked = { ...state, totalSeconds: state.totalSeconds + 1 };
      if (phase === "listening") return ticked;
      ticked.answerSeconds += 1;
      const over = state.mode === "real" && ticked.answerSeconds >= REAL_LIMIT_SECONDS;
      return over ? { ...ticked, phase: "analyzing", hintOpen: false } : ticked;
    }
  }
}

/** 75 → 01:15 */
export function clock(seconds: number) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
}

import type { Dispatch } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { clock, type RoomEvent, type RoomState } from "@/features/interview/room";
import { cn } from "@/lib/cn";
import { AnswerMeter } from "../AnswerMeter/AnswerMeter";
import styles from "./RoomPanel.module.css";

type Props = { state: RoomState; levels: number[]; dispatch: Dispatch<RoomEvent> };

export function RoomPanel({ state, levels, dispatch }: Props) {
  const { phase, question, questions, index } = state;
  const last = index + 1 === questions.length;
  const choosing = phase === "choosing";

  return (
    <section className={styles.panel} aria-label="면접 질문과 답변">
      <div className={styles.top}>
        <p className={styles.count}>
          질문 {index + 1} <span className={styles.total}>/ {questions.length}</span>
        </p>
        <p className={styles.elapsed} aria-label="지금까지 걸린 시간">
          {clock(state.totalSeconds)}
        </p>
        <button type="button" className={styles.pause} aria-label="일시 정지" onClick={() => dispatch({ type: "pause" })}>
          <Icon name="pause" size={20} />
        </button>
      </div>
      <div className={styles.progress} aria-hidden="true">
        {questions.map(({ id }, i) => (
          <span key={id} className={cn(styles.segment, i <= index && styles.reached)} />
        ))}
      </div>
      <p className={styles.category}>
        <span className={styles.badge}>{state.isFollowUp ? "꼬리" : `Q${index + 1}`}</span> {question.category}
      </p>
      <h1 className={cn(styles.question, (choosing || phase === "analyzing") && styles.faded)}>{question.text}</h1>
      {phase === "listening" && (
        <p className={styles.reading} role="status">
          <Icon name="speaker" size={20} /> 면접관이 질문을 읽고 있어요
        </p>
      )}
      {phase === "answering" && (
        <button type="button" className={styles.reading} onClick={() => dispatch({ type: "replay" })}>
          <Icon name="speaker" size={20} /> 질문 다시 듣기
        </button>
      )}
      {state.hintOpen && (
        <div className={styles.hint} id="hint">
          <h2 className={styles.hintTitle}>
            <span className={styles.bulb}>
              <Icon name="bulb" size={20} />
            </span>
            힌트
          </h2>
          <p className={styles.hintText}>{question.hint}</p>
        </div>
      )}
      <div className={styles.bottom}>
        {choosing ? <Choice state={state} last={last} dispatch={dispatch} /> : <Answer state={state} levels={levels} dispatch={dispatch} />}
      </div>
    </section>
  );
}

function Answer({ state, levels, dispatch }: Props) {
  const answering = state.phase === "answering";
  return (
    <>
      <AnswerMeter state={state} levels={levels} />
      <div className={styles.buttons}>
        {state.mode === "practice" && (
          <Button variant="dark" aria-expanded={state.hintOpen} aria-controls="hint" onClick={() => dispatch({ type: "toggleHint" })}>
            <Icon name="bulb" /> {state.hintOpen ? "힌트 접기" : "힌트 보기"}
          </Button>
        )}
        <Button variant="light" onClick={() => dispatch({ type: answering ? "complete" : "startAnswer" })}>
          {answering ? "답변 완료" : "바로 답변 시작"} <Icon name="arrow" size={20} />
        </Button>
      </div>
    </>
  );
}

function Choice({ state, last, dispatch }: { state: RoomState; last: boolean; dispatch: Dispatch<RoomEvent> }) {
  const nextLabel = last ? "면접 마치기" : "다음 질문으로";
  const next = () => dispatch({ type: "next" });
  return (
    <>
      <div className={styles.result} role="status">
        <p className={styles.resultTitle}>
          <span className={state.error ? styles.bad : styles.good}>
            <Icon name={state.error ? "error" : "check"} size={20} />
          </span>
          {state.error ? "분석하지 못했어요" : "분석이 끝났어요"}
        </p>
        <p className={styles.hintText}>{state.error ?? (state.followUp ? "꼬리 질문으로 이어서 보완해 볼까요?" : last ? "마지막 질문까지 답했어요." : "다음 질문으로 넘어가 볼까요?")}</p>
      </div>
      <div className={styles.buttons}>
        {state.error || state.followUp ? (
          <>
            <Button variant="dark" onClick={next}>
              {nextLabel}
            </Button>
            <Button variant="light" onClick={() => dispatch({ type: state.error ? "retry" : "followUp" })}>
              {state.error ? "다시 시도" : "꼬리 질문 받기"} <Icon name="arrow" size={20} />
            </Button>
          </>
        ) : (
          <Button variant="light" onClick={next}>
            {nextLabel} <Icon name="arrow" size={20} />
          </Button>
        )}
      </div>
    </>
  );
}

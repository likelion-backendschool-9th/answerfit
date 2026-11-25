"use client";

import { startTransition, useEffect, useEffectEvent, useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import { PATHS } from "@/app/_lib/paths";
import { Button } from "@/components/ui/Button/Button";
import { finishInterviewAction, submitAnswerAction } from "@/features/interview/actions";
import { CameraStage } from "@/features/interview/components/CameraStage/CameraStage";
import { discardRecordings } from "@/features/interview/recordings";
import { initRoom, roomReducer, type Phase } from "@/features/interview/room";
import { MODE_LABEL, TYPE_LABEL } from "@/features/interview/setup";
import { speak } from "@/features/interview/speech";
import type { Interview } from "@/features/interview/types";
import { useCamera } from "@/features/interview/useCamera";
import { useMicLevels } from "@/features/interview/useMicLevels";
import { useRecorder } from "@/features/interview/useRecorder";
import { cn } from "@/lib/cn";
import { AnalyzingCard } from "../AnalyzingCard/AnalyzingCard";
import { LEVEL_BARS } from "../AnswerMeter/AnswerMeter";
import { DeviceChips } from "../DeviceChips/DeviceChips";
import { PauseDialog } from "../PauseDialog/PauseDialog";
import { RoomPanel } from "../RoomPanel/RoomPanel";
import styles from "./InterviewRoom.module.css";

/** 녹화를 이어 갈지 정한다. 다시 듣기와 일시 정지는 잠시 멈춤이고, 답변이 끝나면 저장한다 */
function recorderState(phase: Phase, paused: boolean) {
  if (phase === "answering" && !paused) return "recording";
  return phase === "answering" || phase === "listening" ? "paused" : "stopped";
}

export function InterviewRoom({ interview, gazeReady }: { interview: Interview; gazeReady: boolean }) {
  const router = useRouter();
  const [state, dispatch] = useReducer(roomReducer, interview, initRoom);
  const { phase, paused, question } = state;
  const { status, stream } = useCamera();
  const recording = phase === "answering" && !paused;
  const levels = useMicLevels(stream, LEVEL_BARS, recording);
  useRecorder({ stream, interviewId: interview.id, questionId: question.id, state: recorderState(phase, paused) });

  useEffect(() => {
    const timer = setInterval(() => dispatch({ type: "tick" }), 1000);
    return () => clearInterval(timer);
  }, []);

  // 질문을 읽고, 다 읽으면 바로 녹음을 시작한다. 멈췄다가 이어 하면 처음부터 다시 읽는다
  useEffect(() => {
    if (phase !== "listening" || paused) return;
    return speak(question.text, () => dispatch({ type: "startAnswer" }));
  }, [phase, paused, question]);

  const analyze = useEffectEvent(async (isCurrent: () => boolean) => {
    const result = await submitAnswerAction({ interviewId: interview.id, questionId: question.id, seconds: state.answerSeconds }).catch(() => ({
      ok: false as const,
      error: "분석하지 못했어요. 다시 시도해 주세요.",
    }));
    if (isCurrent()) dispatch(result.ok ? { type: "analyzed", followUp: result.followUp } : { type: "failed", error: result.error });
  });

  useEffect(() => {
    if (phase !== "analyzing") return;
    let current = true;
    void analyze(() => current);
    return () => {
      current = false;
    };
  }, [phase]);

  const [finishError, setFinishError] = useState<string>();
  const finish = useEffectEvent(async () => {
    const result = await finishInterviewAction(interview.id).catch(() => ({ error: "면접을 마치지 못했어요." }));
    if (result) setFinishError(result.error);
  });

  useEffect(() => {
    if (phase === "finished") startTransition(() => finish());
  }, [phase]);

  function quit() {
    discardRecordings(interview.id);
    router.replace(PATHS.home);
  }

  const statusLabel = paused || phase === "analyzing" || phase === "choosing" ? "녹화 일시 중지" : phase === "answering" ? (stream ? "녹화 중" : "녹화 안 함") : "질문 듣는 중";
  const dotStyle = recording && stream ? styles.red : phase === "listening" && !paused ? styles.gray : styles.yellow;

  return (
    <div className={styles.room}>
      <CameraStage stream={stream} dimmed={phase === "choosing" || phase === "analyzing"} className={styles.stage} />
      <div className={styles.status}>
        <p className={styles.chip}>
          <span className={cn(styles.dot, dotStyle)} /> {statusLabel}
        </p>
        <p className={styles.chip}>
          {TYPE_LABEL[interview.type]} · {MODE_LABEL[interview.mode]}
        </p>
      </div>
      <DeviceChips status={status} gazeReady={gazeReady} />
      <div className={styles.panel} inert={phase === "analyzing" || phase === "finished"}>
        <RoomPanel state={state} levels={levels} dispatch={dispatch} />
      </div>
      {phase === "analyzing" && <AnalyzingCard />}
      {finishError && (
        <div className={styles.failed} role="alert">
          <p>{finishError}</p>
          <Button variant="light" onClick={quit}>
            홈으로 가기
          </Button>
        </div>
      )}
      <PauseDialog open={paused} state={state} onResume={() => dispatch({ type: "resume" })} onQuit={quit} />
    </div>
  );
}

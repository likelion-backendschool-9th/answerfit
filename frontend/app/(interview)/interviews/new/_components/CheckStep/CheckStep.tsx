"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { CameraStage } from "@/features/interview/components/CameraStage/CameraStage";
import { speak } from "@/features/interview/speech";
import type { InterviewMode } from "@/features/interview/types";
import { useCamera } from "@/features/interview/useCamera";
import { useMicLevels } from "@/features/interview/useMicLevels";
import { DeviceRow } from "../DeviceRow/DeviceRow";
import { ProcessGuide } from "../ProcessGuide/ProcessGuide";
import { Section } from "../Section/Section";
import styles from "./CheckStep.module.css";

const BARS = 8;
const SAMPLE = "안녕하세요. 면접관 목소리가 잘 들리나요?";

type Props = { mode: InterviewMode; gazeReady: boolean; onReadyChange: (ready: boolean) => void };

export function CheckStep({ mode, gazeReady, onReadyChange }: Props) {
  const { status, stream, cameraName, micName, retry } = useCamera();
  const levels = useMicLevels(stream, BARS);
  const [speaking, setSpeaking] = useState(false);
  const stopSpeaking = useRef<() => void>(undefined);
  const ready = status === "ready";

  useEffect(() => {
    onReadyChange(ready);
  }, [ready, onReadyChange]);

  useEffect(() => () => stopSpeaking.current?.(), []);

  function listen() {
    stopSpeaking.current?.();
    setSpeaking(true);
    stopSpeaking.current = speak(SAMPLE, () => setSpeaking(false));
  }

  return (
    <>
      <Section title="온라인 면접 환경 점검">
        <CameraStage stream={stream} className={styles.stage}>
          <svg className={styles.guide} viewBox="0 0 210 274" aria-hidden="true">
            <ellipse cx="105" cy="137" rx="103" ry="135" />
          </svg>
          <p className={styles.preview}>미리보기 · 아직 녹화되지 않아요</p>
          {ready && gazeReady && (
            <p className={styles.face}>
              <span className={styles.ok}>
                <Icon name="check" />
              </span>
              얼굴이 가이드 안에 있어요
            </p>
          )}
        </CameraStage>
        {(status === "denied" || status === "missing") && (
          <div className={styles.problem} role="alert">
            <p>{status === "denied" ? "카메라와 마이크 사용을 허용해 주세요. 주소창의 권한 설정에서 바꿀 수 있어요." : "카메라나 마이크를 찾지 못했어요. 연결을 확인해 주세요."}</p>
            <Button variant="outline" onClick={retry}>
              다시 확인
            </Button>
          </div>
        )}
        <div className={styles.devices}>
          <DeviceRow icon="video" name="카메라" description={cameraName || "카메라를 확인하고 있어요"} state={status} />
          <DeviceRow icon="mic" name="마이크" description="말해 보세요 · 막대가 움직이면 정상" state={status} title={micName}>
            <span className={styles.bars} aria-hidden="true">
              {Array.from({ length: BARS }, (_, i) => {
                const level = levels[i] ?? 0;
                return <span key={i} className={level > 0.04 ? styles.on : styles.off} style={{ height: `${Math.round(8 + level * 16)}px` }} />;
              })}
            </span>
          </DeviceRow>
          <DeviceRow icon="speaker" name="스피커" description="면접관 목소리(TTS)가 들리는지 확인해 주세요">
            <Button variant="outline" className={styles.listen} onClick={listen}>
              {speaking ? "읽고 있어요" : "들어 보기"}
            </Button>
          </DeviceRow>
          <DeviceRow icon="face" name="시선 인식" description="정면 응시 비율로 점수를 내요 · 영상 분석은 브라우저 안에서만" state={gazeReady ? status : "soon"} />
        </div>
      </Section>
      <Section title="면접은 이렇게 진행돼요" description="질문 수만큼 아래 네 단계를 반복해요. 쉬는 시간은 없지만 언제든 일시 정지할 수 있어요.">
        <ProcessGuide mode={mode} />
      </Section>
    </>
  );
}

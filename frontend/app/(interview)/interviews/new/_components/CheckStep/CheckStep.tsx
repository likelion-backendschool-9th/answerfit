"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { CameraStage } from "@/features/interview/components/CameraStage/CameraStage";
import { speak } from "@/features/interview/speech";
import { useCamera } from "@/features/interview/useCamera";
import { useMicLevels } from "@/features/interview/useMicLevels";
import { cn } from "@/lib/cn";
import { Section } from "../Section/Section";
import styles from "./CheckStep.module.css";

/** 마이크 막대의 칸 수 */
const CELLS = 20;
/** 이보다 크면 소리가 들어온 것으로 본다 */
const HEARD = 0.04;
const SAMPLE = "안녕하세요. 면접관 목소리가 잘 들리나요?";

type Tone = "ok" | "warn" | "pending" | "bad";
type Check = { name: string; description: string; tone: Tone };

type Props = { gazeReady: boolean; onReadyChange: (ready: boolean) => void };

export function CheckStep({ gazeReady, onReadyChange }: Props) {
  const { status, stream, cameraName, micName, retry } = useCamera();
  const levels = useMicLevels(stream, 3);
  const [heard, setHeard] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const stopSpeaking = useRef<() => void>(undefined);
  const ready = status === "ready";
  const level = levels.length === 0 ? 0 : levels.reduce((sum, value) => sum + value, 0) / levels.length;
  const faceReady = ready && gazeReady;

  useEffect(() => {
    onReadyChange(ready);
  }, [ready, onReadyChange]);

  // 한 번이라도 소리가 들어오면 정상으로 본다
  if (level > HEARD && !heard) setHeard(true);

  useEffect(() => () => stopSpeaking.current?.(), []);

  function listen() {
    stopSpeaking.current?.();
    setSpeaking(true);
    stopSpeaking.current = speak(SAMPLE, () => setSpeaking(false));
  }

  const blocked = status === "denied" || status === "missing";
  const checks: Check[] = [
    ready
      ? { name: "카메라 연결됨", description: cameraName || "카메라", tone: "ok" }
      : { name: blocked ? "카메라를 쓸 수 없어요" : "카메라 확인 중", description: blocked ? "권한과 연결을 확인해 주세요" : "잠시만 기다려 주세요", tone: blocked ? "bad" : "pending" },
    !ready
      ? { name: blocked ? "마이크를 쓸 수 없어요" : "마이크 확인 중", description: blocked ? "권한과 연결을 확인해 주세요" : "잠시만 기다려 주세요", tone: blocked ? "bad" : "pending" }
      : heard
        ? { name: "마이크 입력 정상", description: micName || "마이크", tone: "ok" }
        : { name: "마이크 연결됨", description: "말해 보세요 · 아래 막대가 움직이면 정상이에요", tone: "pending" },
    faceReady ? { name: "얼굴 인식됨", description: "정면을 바라보고 있어요", tone: "ok" } : { name: "얼굴 인식", description: "아직 준비 중인 기능이에요", tone: "pending" },
    faceReady
      ? { name: "시선 분석", description: "면접 내내 정면을 똑바로 바라봐 주세요", tone: "warn" }
      : { name: "시선 분석", description: "아직 준비 중인 기능이에요", tone: "pending" },
  ];

  return (
    <Section title="시작 전에 카메라와 마이크를 확인할게요" description="영상은 분석에만 쓰이고, 시선 분석은 브라우저 안에서 처리돼요.">
      <div className={styles.layout}>
        {blocked ? (
          <div className={styles.noCamera} role="alert">
            <span className={styles.noCameraIcon}>
              <Icon name="cameraOff" size={28} />
            </span>
            <p className={styles.noCameraTitle}>카메라가 인식되지 않아요</p>
            <p className={styles.noCameraText}>{status === "denied" ? "카메라와 마이크 사용을 허용해 주세요. 주소창의 권한 설정에서 바꿀 수 있어요." : "카메라나 마이크를 찾지 못했어요. 연결을 확인해 주세요."}</p>
            <Button variant="outline" className={styles.retry} onClick={retry}>
              다시 확인
            </Button>
          </div>
        ) : (
          <CameraStage stream={stream} className={styles.stage}>
            <svg className={styles.guide} viewBox="0 0 210 274" aria-hidden="true">
              <ellipse cx="105" cy="137" rx="103" ry="135" />
            </svg>
            {faceReady && (
              <p className={styles.face}>
                <span className={styles.faceIcon}>
                  <Icon name="check" size={20} />
                </span>
                얼굴이 가이드 안에 들어왔어요
              </p>
            )}
          </CameraStage>
        )}
        <section className={styles.card} aria-labelledby="checklist-title">
          <h3 id="checklist-title" className={styles.cardTitle}>
            체크리스트
          </h3>
          <ul className={styles.checks}>
            {checks.map(({ name, description, tone }) => (
              <li key={name} className={styles.check}>
                <span className={cn(styles.mark, styles[tone])} aria-hidden="true">
                  {tone === "ok" ? <Icon name="tick" size={14} /> : tone === "pending" ? null : "!"}
                </span>
                <span>
                  <span className={styles.name}>{name}</span>
                  <span className={styles.description}>{description}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className={styles.meter} role="meter" aria-label="마이크 입력 크기" aria-valuemin={0} aria-valuemax={CELLS} aria-valuenow={Math.round(level * CELLS)}>
            {Array.from({ length: CELLS }, (_, i) => (
              <span key={i} className={i < Math.round(level * CELLS) ? styles.on : styles.off} />
            ))}
          </div>
          <Button variant="outline" className={styles.listen} onClick={listen}>
            {speaking ? "읽고 있어요" : "질문 음성 미리 듣기"}
          </Button>
        </section>
      </div>
    </Section>
  );
}

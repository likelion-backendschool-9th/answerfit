"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { clock, type RoomState } from "@/features/interview/room";
import styles from "./PauseDialog.module.css";

type Props = { open: boolean; state: RoomState; onResume: () => void; onQuit: () => void };

export function PauseDialog({ open, state, onResume, onQuit }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element || !open) return;
    element.showModal();
    // 화면을 떠나면 닫고, 멈춘 채로 돌아오면 다시 연다
    return () => element.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="pause-title"
      onCancel={(event) => {
        event.preventDefault();
        onResume();
      }}
    >
      <span className={styles.icon}>
        <Icon name="pause" size={28} />
      </span>
      <h2 id="pause-title" className={styles.title}>
        면접을 잠시 멈췄어요
      </h2>
      <p className={styles.description}>
        녹화와 타이머가 함께 멈췄어요.
        <br />
        준비되면 이어서 진행하세요.
      </p>
      <p className={styles.info}>
        <span>
          현재 질문{" "}
          <span className={styles.number}>
            {state.index + 1} / {state.questions.length}
          </span>
        </span>
        <span>
          지금까지 <span className={styles.number}>{clock(state.totalSeconds)}</span>
        </span>
      </p>
      <Button variant="light" autoFocus onClick={onResume}>
        이어서 하기 <Icon name="arrow" size={20} />
      </Button>
      <button type="button" className={styles.quit} onClick={onQuit}>
        면접 끝내기
      </button>
      <p className={styles.warning}>면접을 완주하지 않으면 분석을 받을 수 없어요.</p>
    </dialog>
  );
}

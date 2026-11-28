"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon/Icon";
import type { Experience } from "@/features/experience/types";
import { resizeByKey, startResize } from "../../_lib/drag";
import { ExperienceForm } from "../ExperienceForm/ExperienceForm";
import styles from "./DetailPanel.module.css";

/** 패널 폭(px). 왼쪽 끝을 끌어 넓힌다. 닫았다 열어도 마지막 폭을 쓴다 */
const PANEL_WIDTH = 600;
const PANEL_MIN = 400;
/** 화면 왼쪽에 이만큼은 남겨 표가 보이게 한다 */
const PANEL_GAP = 48;

type Props = { experience: Experience | null; custom: string[]; onSaved: (experience: Experience) => void; onClose: () => void };

/** 행 메뉴의 "상세 열기"로 오른쪽에서 열린다. experience가 null이면 닫혀 있다 */
export function DetailPanel({ experience, custom, onSaved, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [width, setWidth] = useState(PANEL_WIDTH);
  const open = experience !== null;
  const max = () => Math.max(PANEL_MIN, window.innerWidth - PANEL_GAP);

  useEffect(() => {
    const element = dialog.current;
    if (!element || !open) return;
    element.showModal();
    return () => element.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      className={styles.panel}
      style={{ width: `min(${width}px, 100%)` }}
      aria-label="경험 상세"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {experience && (
        <>
          <span
            role="separator"
            aria-orientation="vertical"
            aria-label="패널 폭"
            aria-valuenow={width}
            tabIndex={0}
            title="끌어서 폭 조절 · 두 번 누르면 처음 폭"
            className={styles.resizer}
            onPointerDown={(event) => startResize(event, width, "left", PANEL_MIN, max(), setWidth)}
            onKeyDown={(event) => resizeByKey(event, width, "left", PANEL_MIN, max(), setWidth)}
            onDoubleClick={() => setWidth(PANEL_WIDTH)}
          />
          <div className={styles.top}>
            <h2 className={styles.title}>{experience.title || "새 경험"}</h2>
            <button type="button" className={styles.close} aria-label="닫기" onClick={onClose}>
              <Icon name="close" />
            </button>
          </div>
          <ExperienceForm
            key={experience.id}
            experience={experience}
            custom={custom}
            onCancel={onClose}
            onSaved={(next) => {
              onSaved(next);
              onClose();
            }}
          />
        </>
      )}
    </dialog>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon/Icon";
import type { Experience } from "@/features/experience/types";
import { ExperienceForm } from "../ExperienceForm/ExperienceForm";
import styles from "./DetailPanel.module.css";

type Props = { experience: Experience | null; custom: string[]; onSaved: (experience: Experience) => void; onClose: () => void };

/** 행의 ▸를 누르면 오른쪽에서 열린다. experience가 null이면 닫혀 있다 */
export function DetailPanel({ experience, custom, onSaved, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const open = experience !== null;

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
      aria-label="경험 상세"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {experience && (
        <>
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

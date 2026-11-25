"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "../Icon/Icon";
import styles from "./Modal.module.css";

type Props = { open: boolean; title: string; description?: string; onClose: () => void; children: ReactNode };

/** 닫혀 있으면 내용을 그리지 않아 열 때마다 처음 상태로 시작한다 */
export function Modal({ open, title, description, onClose, children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element || !open) return;
    element.showModal();
    return () => element.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      className={styles.modal}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {open && (
        <>
          <div className={styles.top}>
            <h2 className={styles.title}>{title}</h2>
            <button type="button" className={styles.close} aria-label="닫기" onClick={onClose}>
              <Icon name="close" />
            </button>
          </div>
          {description && <p className={styles.description}>{description}</p>}
          {children}
        </>
      )}
    </dialog>
  );
}

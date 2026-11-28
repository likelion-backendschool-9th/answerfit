"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./Popover.module.css";

/** escape는 취소, outside는 바깥을 누르거나 스크롤해 닫힌 것이다 */
export type CloseReason = "escape" | "outside";

type Props = { anchor: HTMLElement; label: string; onClose: (reason: CloseReason) => void; children: ReactNode };

/**
 * 셀 아래에 붙는 작은 창. 표의 가로 스크롤 상자에 잘리지 않도록 body에 그리고 화면 좌표로 놓는다.
 * 스크롤하면 셀에서 떨어지므로 닫는다.
 */
export function Popover({ anchor, label, onClose, children }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useLayoutEffect(() => {
    close.current = onClose;
  });

  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    const cell = anchor.getBoundingClientRect();
    const below = cell.bottom + element.offsetHeight + 8 <= window.innerHeight;
    element.style.top = `${below ? cell.bottom + 4 : Math.max(8, cell.top - element.offsetHeight - 4)}px`;
    element.style.left = `${Math.max(8, Math.min(cell.left, window.innerWidth - element.offsetWidth - 8))}px`;
    // 안쪽 부품이 autoFocus로 먼저 잡았으면 그대로 둔다
    if (!element.contains(document.activeElement)) element.querySelector<HTMLElement>("input, textarea, button")?.focus();
  }, [anchor]);

  useEffect(() => {
    const inside = (target: EventTarget | null) => target instanceof Node && (box.current?.contains(target) || anchor.contains(target));
    const press = (event: PointerEvent) => !inside(event.target) && close.current("outside");
    const scroll = (event: Event) => !inside(event.target) && close.current("outside");
    document.addEventListener("pointerdown", press);
    window.addEventListener("scroll", scroll, true);
    return () => {
      document.removeEventListener("pointerdown", press);
      window.removeEventListener("scroll", scroll, true);
    };
  }, [anchor]);

  return createPortal(
    <div
      ref={box}
      role="dialog"
      aria-label={label}
      className={styles.popover}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        onClose("escape");
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

import type { KeyboardEvent, PointerEvent } from "react";

/** 키보드로 폭을 바꿀 때 한 번에 움직이는 양(px) */
const KEY_STEP = 16;

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * 손잡이를 끌어 폭을 바꾼다. side는 손잡이가 붙은 쪽이다.
 * 오른쪽 손잡이(표 열)는 오른쪽으로 끌면 커지고, 왼쪽 손잡이(오른쪽에 붙은 패널)는 왼쪽으로 끌면 커진다.
 */
export function startResize(event: PointerEvent, width: number, side: "right" | "left", min: number, max: number, onWidth: (width: number) => void) {
  if (event.button !== 0) return;
  event.preventDefault();
  const from = event.clientX;
  const sign = side === "right" ? 1 : -1;
  const body = document.body.style;
  const move = (next: globalThis.PointerEvent) => onWidth(clamp(width + sign * (next.clientX - from), min, max));
  const stop = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
    body.cursor = "";
    body.userSelect = "";
  };
  // 끄는 동안 글자가 선택되거나 커서가 바뀌지 않게 한다
  body.cursor = "col-resize";
  body.userSelect = "none";
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop);
}

/** 손잡이에 포커스가 있을 때 좌우 방향키로 폭을 바꾼다 */
export function resizeByKey(event: KeyboardEvent, width: number, side: "right" | "left", min: number, max: number, onWidth: (width: number) => void) {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  event.stopPropagation();
  const grow = (event.key === "ArrowRight") === (side === "right");
  onWidth(clamp(width + (grow ? KEY_STEP : -KEY_STEP), min, max));
}

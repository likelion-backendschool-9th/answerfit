"use client";

import { useSyncExternalStore } from "react";
import { FAVICON, FAVICON_ID, THEME_STORAGE_KEY, type Theme } from "@/app/_lib/theme";
import { Icon } from "@/components/ui/Icon/Icon";
import styles from "./ThemeToggle.module.css";

/* 지금 모드는 layout.tsx의 스크립트가 <html data-theme>에 단 값이다. 토글이 바꿔도 따라가도록 속성을 지켜본다 */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
const current = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
// 서버는 사용자 설정을 몰라 어느 쪽도 고르지 않은 채로 그린다. 선택 표시 위치는 CSS가 data-theme으로 정한다
const unknown = () => null;

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.getElementById(FAVICON_ID)?.setAttribute("href", FAVICON[theme]);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // 저장할 수 없는 환경이면 이번 화면에서만 바뀐다
  }
}

/** 색이 한꺼번에 바뀌어 눈이 부시지 않게 이전·새 화면을 겹쳐 바꾼다. 지원하지 않거나 동작 줄이기면 바로 바꾼다 */
function choose(theme: Theme) {
  if (theme === current()) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !document.startViewTransition) apply(theme);
  else document.startViewTransition(() => apply(theme));
}

const ICONS = [
  { theme: "light", icon: "sun" },
  { theme: "dark", icon: "moon" },
] as const;

/**
 * 헤더의 주간·야간 모드 전환. 알약 전체가 버튼 하나라 어느 쪽을 눌러도 지금 모드의 반대로 바뀐다.
 * 마우스를 덜 움직이게 하려는 것이다. 선택 표시(원)는 지금 모드 쪽으로 미끄러진다.
 */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, current, unknown);
  return (
    <button
      type="button"
      className={styles.toggle}
      aria-label="야간 모드"
      // 서버는 모드를 몰라 눌림 상태를 비워 둔다
      aria-pressed={theme === null ? undefined : theme === "dark"}
      onClick={() => choose(current() === "dark" ? "light" : "dark")}
    >
      <span className={styles.thumb} aria-hidden="true" />
      {ICONS.map((option) => (
        <span key={option.theme} className={styles.option} data-theme-option={option.theme}>
          <Icon name={option.icon} size={18} />
        </span>
      ))}
    </button>
  );
}

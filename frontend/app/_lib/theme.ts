/** 주간·야간 모드. layout.tsx의 스크립트(첫 화면)와 ThemeToggle(전환)이 같이 쓴다 */
export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";
export const FAVICON_ID = "favicon";

/** 모드에 맞는 로고를 파비콘으로 쓴다 */
export const FAVICON: Record<Theme, string> = {
  light: "/brand/logo-light.png",
  dark: "/brand/logo-dark.png",
};

/**
 * 그리기 전에 실행하는 스크립트. 저장된 선택이 없으면 기기 설정을 따르고, <html data-theme>과 파비콘을 맞춘다.
 * 파비콘 링크는 이 스크립트가 만든다. React가 그리면 하이드레이션 때 주간 링크를 하나 더 넣어 야간 파비콘을 가리기 때문이다.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}catch(e){t="light"}document.documentElement.setAttribute("data-theme",t);var i=document.createElement("link");i.id=${JSON.stringify(FAVICON_ID)};i.rel="icon";i.href=${JSON.stringify(FAVICON)}[t];document.head.appendChild(i)})()`;

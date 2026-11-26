"use client";

import { useLayoutEffect } from "react";

/**
 * 홈이 보이는 동안에만 <html data-snap="sections">을 달아 구역 단위 스크롤을 켠다(globals.css).
 * Next.js는 떠난 화면을 지우지 않고 Activity로 숨겨 두므로, html:has(...)로 켜면 다른 화면에도 스냅이 남아
 * 푸터 맞춤 지점 때문에 스크롤이 맨 아래로 끌려간다. 숨겨질 때 정리 함수가 돌아 속성을 뗀다.
 */
export function SnapScroll() {
  useLayoutEffect(() => {
    const html = document.documentElement;
    html.dataset.snap = "sections";
    return () => {
      delete html.dataset.snap;
    };
  }, []);
  return null;
}

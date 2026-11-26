"use client";

/**
 * 그리기 전에 실행할 인라인 스크립트. 서버 HTML에서는 실행되는 스크립트로, 브라우저에서 React가 다시 그릴 때는
 * 실행되지 않는 text/plain으로 둔다. React가 "컴포넌트 안의 script" 경고를 내지 않게 하는 Next.js 안내 방식이다.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

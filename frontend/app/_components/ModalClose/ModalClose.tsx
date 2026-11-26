"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

/** 모달로 뜬 로그인 창을 닫는다. 뒤로 가기라 보던 화면으로 돌아간다 */
export function ModalClose({ className, children }: { className: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <button type="button" className={className} aria-label="로그인 닫기" onClick={() => router.back()}>
      {children}
    </button>
  );
}

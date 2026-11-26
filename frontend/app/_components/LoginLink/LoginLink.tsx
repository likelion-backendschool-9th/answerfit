"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PATHS } from "@/app/_lib/paths";

/**
 * 로그인 모달을 여는 링크. 로그인한 뒤 지금 화면으로 돌아오도록 경로를 next로 넘긴다.
 * shortcut: 검색 조건(?…)은 넘기지 않는다. 필터 상태까지 되살려야 하면 useSearchParams를 더한다.
 */
export function LoginLink({ className, children }: { className?: string; children: ReactNode }) {
  const pathname = usePathname();
  const next = pathname === PATHS.login ? undefined : pathname;
  return (
    <Link href={next ? { pathname: PATHS.login, query: { next } } : PATHS.login} className={className}>
      {children}
    </Link>
  );
}

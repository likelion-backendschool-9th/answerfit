import type { ReactNode } from "react";
import Link from "next/link";
import { PATHS } from "@/app/_lib/paths";
import { BrandLogo } from "../BrandLogo/BrandLogo";
import styles from "./SiteFooter.module.css";

const SERVICES = [
  { href: PATHS.newInterview, label: "모의 면접" },
  { href: PATHS.archive, label: "질문 아카이브" },
  { href: PATHS.my, label: "마이페이지" },
];

const REPOSITORY = "https://github.com/likelion-backendschool-9th/answerfit";

/**
 * 배경을 칠하지 않아 놓인 화면의 배경색을 따라간다. 서버 전용 코드를 넣지 않는다.
 * children은 개발 중에만 쓰는 데이터·역할 전환기 자리다. AppFooter가 넘기지 않으면 자리째 사라진다.
 * switcherOnly면 관리자 화면처럼 서비스 푸터 없이 전환기만 그린다.
 */
export function SiteFooter({ children, switcherOnly = false }: { children?: ReactNode; switcherOnly?: boolean }) {
  if (switcherOnly) return <footer className={styles.switcherOnly}>{children}</footer>;
  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <div className={styles.about}>
          <BrandLogo iconSize={28} />
          <p className={styles.description}>나에게 맞는 답변을 찾는 AI 모의 면접, ANSWERFIT. 실전처럼 연습하고, AI 피드백으로 다음 면접을 준비하세요.</p>
        </div>
        <nav className={styles.services} aria-labelledby="footer-services">
          <h2 id="footer-services" className={styles.heading}>
            주요 서비스
          </h2>
          <ul className={styles.links}>
            {SERVICES.map(({ href, label }) => (
              <li key={href}>
                <Link href={href}>{label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className={styles.bottom}>
        <a href={REPOSITORY} className={styles.github} target="_blank" rel="noreferrer" aria-label="ANSWERFIT GitHub 저장소 (새 창)">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
            <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.1c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.9 1.2 1.9 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.4-1.3-5.4-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 5 18.3 5.3 18.3 5.3c.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z" />
          </svg>
        </a>
        <span className={styles.line} aria-hidden="true" />
        <p className={styles.meta}>
          <span>© 2026 ANSWERFIT. All rights reserved.</span>
          <span className={styles.dot} aria-hidden="true">
            •
          </span>
          <span>개발자 | 문지혜, 박준하, 배기현, 임재현</span>
        </p>
      </div>
      {children && <div className={styles.dev}>{children}</div>}
    </footer>
  );
}

import Link from "next/link";
import { PATHS } from "@/app/_lib/paths";
import { Icon } from "@/components/ui/Icon/Icon";
import { BrandLogo } from "../BrandLogo/BrandLogo";
import styles from "./TopBar.module.css";

const MENU = [
  { href: PATHS.newInterview, label: "모의 면접" },
  { href: PATHS.archive, label: "질문 아카이브" },
  { href: PATHS.my, label: "마이페이지" },
];

/** 로그인한 회원이 보는 화면의 머리글 */
export function TopBar({ current }: { current: string }) {
  return (
    <header className={styles.bar}>
      <div className={styles.brand}>
        <BrandLogo iconSize={32} />
        <span className={styles.tagline}>MOCK INTERVIEW ROOM</span>
      </div>
      <nav className={styles.nav} aria-label="주 메뉴">
        {MENU.map(({ href, label }) => (
          <Link key={href} href={href} className={styles.link} aria-current={href === current ? "page" : undefined}>
            {label}
          </Link>
        ))}
      </nav>
      <div className={styles.icons}>
        <Link href={PATHS.notifications} className={styles.icon} aria-label="알림">
          <Icon name="bell" />
        </Link>
        <Link href={PATHS.my} className={`${styles.icon} ${styles.avatar}`} aria-label="내 정보">
          <Icon name="person" />
        </Link>
      </div>
    </header>
  );
}

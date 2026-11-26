import { Suspense } from "react";
import Link from "next/link";
import { PATHS } from "@/app/_lib/paths";
import { Icon } from "@/components/ui/Icon/Icon";
import { getSession } from "@/features/session/session";
import { BrandLogo } from "../BrandLogo/BrandLogo";
import { ThemeToggle } from "../ThemeToggle/ThemeToggle";
import styles from "./TopBar.module.css";

const MENU = [
  { href: PATHS.newInterview, label: "모의면접" },
  { href: PATHS.archive, label: "질문 아카이브" },
  { href: PATHS.experiences, label: "이력 관리" },
];

/** 모든 화면의 머리글. 스크롤해도 위에 붙어 있다. 오른쪽은 로그인 여부에 따라 바뀐다 */
export function TopBar({ current }: { current: string }) {
  return (
    <header className={styles.bar}>
      <div className={styles.brand}>
        <BrandLogo iconSize={26} />
      </div>
      <nav className={styles.nav} aria-label="주 메뉴">
        {MENU.map(({ href, label }) => (
          <Link key={href} href={href} className={styles.link} aria-current={href === current ? "page" : undefined}>
            {label}
          </Link>
        ))}
      </nav>
      <div className={styles.icons}>
        <ThemeToggle />
        <span className={styles.divider} aria-hidden="true" />
        {/* 세션을 읽는 동안에는 비워 둔다. 회원에게 로그인 버튼이 잠깐 보이지 않게 하기 위해서다 */}
        <Suspense>
          <Account />
        </Suspense>
      </div>
    </header>
  );
}

/** 비회원은 로그인·회원가입, 회원은 알림·내 정보 아이콘을 본다 */
async function Account() {
  // 세션을 못 불러오면 비회원으로 보여 준다. 오류는 화면이 알린다
  const session = await getSession().catch(() => null);
  if (!session) {
    return (
      <>
        <Link href={PATHS.login} className={`${styles.text} ${styles.login}`}>
          로그인
        </Link>
        <Link href={PATHS.signup} className={styles.text}>
          회원가입
        </Link>
      </>
    );
  }
  return (
    <>
      <Link href={PATHS.notifications} className={styles.icon} aria-label="알림">
        <Icon name="bell" size={20} />
      </Link>
      <Link href={PATHS.my} className={`${styles.icon} ${styles.avatar}`} aria-label="내 정보">
        <Icon name="person" size={20} />
      </Link>
    </>
  );
}

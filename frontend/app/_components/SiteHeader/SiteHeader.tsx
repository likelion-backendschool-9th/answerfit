import { Suspense } from "react";
import Link from "next/link";
import { PATHS } from "@/app/_lib/paths";
import { logoutAction } from "@/features/auth/actions";
import { getSession } from "@/features/session/session";
import { BrandLogo } from "../BrandLogo/BrandLogo";
import { SeoulClock } from "../SeoulClock/SeoulClock";
import styles from "./SiteHeader.module.css";

/** backdrop은 다른 화면 뒤에 까는 장식용이다. 세션을 조회하지 않는다 */
export function SiteHeader({ backdrop = false }: { backdrop?: boolean }) {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <BrandLogo iconSize={32} />
        <span className={styles.tagline}>MOCK INTERVIEW ROOM</span>
      </div>
      <div className={styles.clock}>
        <SeoulClock />
      </div>
      <nav className={styles.nav} aria-label="주 메뉴">
        <Link href={PATHS.newInterview}>모의 면접</Link>
        <Link href={PATHS.archive}>질문 아카이브</Link>
        <Link href={PATHS.my}>마이페이지</Link>
        {backdrop ? (
          <span className={styles.account}>로그인</span>
        ) : (
          <Suspense fallback={<span className={styles.account}>로그인</span>}>
            <Account />
          </Suspense>
        )}
      </nav>
    </header>
  );
}

async function Account() {
  const session = await getSession();
  if (!session) {
    return (
      <Link href={PATHS.login} className={styles.account}>
        로그인
      </Link>
    );
  }
  return (
    <form action={logoutAction}>
      <button type="submit" className={styles.account}>
        로그아웃
      </button>
    </form>
  );
}

import { Suspense } from "react";
import { BrandLogo } from "@/app/_components/BrandLogo/BrandLogo";
import { getSession } from "@/features/session/session";
import styles from "./page.module.css";

/** 홈 화면을 구현하기 전까지 두는 임시 화면 */
export default function HomePage() {
  return (
    <div className={styles.content}>
      <BrandLogo />
      <h1 className={styles.title}>홈 화면은 준비 중이에요</h1>
      <Suspense>
        <Greeting />
      </Suspense>
    </div>
  );
}

async function Greeting() {
  const session = await getSession();
  return <p className={styles.description}>{session ? `${session.nickname}님, 로그인했어요.` : "로그인하지 않았어요."}</p>;
}

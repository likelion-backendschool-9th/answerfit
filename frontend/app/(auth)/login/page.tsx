import type { Metadata } from "next";
import { HomeHero } from "@/app/_components/HomeHero/HomeHero";
import { Main } from "@/app/_components/Main/Main";
import { TopBar } from "@/app/_components/TopBar/TopBar";
import { PATHS } from "@/app/_lib/paths";
import { LoginCard } from "@/app/_components/LoginCard/LoginCard";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "로그인" };

type Props = { searchParams: Promise<{ next?: string | string[]; error?: string | string[] }> };

/**
 * 주소로 직접 들어오거나 새로고침했을 때의 로그인 화면. 홈을 배경으로 깐다.
 * 화면 안에서 로그인을 누르면 이 페이지 대신 @auth/(.)login 모달이 뜬다.
 * 푸터가 없는 (auth) 그룹이라 본문을 직접 그린다.
 */
export default function LoginPage({ searchParams }: Props) {
  return (
    <Main>
      <div className={styles.screen}>
        <div className={styles.backdrop} inert>
          <TopBar current={PATHS.home} />
          <HomeHero />
        </div>
        <LoginCard searchParams={searchParams} />
      </div>
    </Main>
  );
}

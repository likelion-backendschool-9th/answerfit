import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { BrandLogo } from "@/app/_components/BrandLogo/BrandLogo";
import { safeNextPath } from "@/lib/next-path";
import { socialLoginNotice } from "@/features/auth/api";
import { HomeHero } from "@/app/_components/HomeHero/HomeHero";
import { TopBar } from "@/app/_components/TopBar/TopBar";
import { PATHS } from "@/app/_lib/paths";
import { LoginForm } from "./_components/LoginForm/LoginForm";
import { SocialButtons } from "./_components/SocialButtons/SocialButtons";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "로그인" };

type Props = { searchParams: Promise<{ next?: string | string[]; error?: string | string[] }> };

export default function LoginPage({ searchParams }: Props) {
  return (
    <div className={styles.screen}>
      <div className={styles.backdrop} inert>
        <TopBar current={PATHS.home} />
        <HomeHero />
      </div>
      <section className={styles.modal} aria-labelledby="login-title">
        <div className={styles.body}>
          <div className={styles.top}>
            <BrandLogo />
            <Link href="/" className={styles.close} aria-label="로그인 닫기">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="m5 5 14 14M19 5 5 19" />
              </svg>
            </Link>
          </div>
          <h1 id="login-title" className={styles.title}>
            다시 만나서 반가워요
          </h1>
          <p className={styles.description}>로그인하고 말로 답하는 모의 면접을 이어가세요.</p>
          <Suspense fallback={<div className={styles.loading} />}>
            <Forms searchParams={searchParams} />
          </Suspense>
        </div>
        <div className={styles.footer}>
          <Link href="/signup" className={styles.signup}>
            처음 오셨나요?
          </Link>
        </div>
      </section>
    </div>
  );
}

/** 돌아갈 주소를 폼과 함께 그린다. 서버 액션이 주소를 다시 검사한다. 카카오 로그인이 실패해 돌아오면 error가 붙는다 */
async function Forms({ searchParams }: Props) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const notice = await socialLoginNotice(params.error);
  return (
    <>
      <LoginForm next={next} />
      <p className={styles.divider}>또는 소셜 계정으로</p>
      <SocialButtons next={next} notice={notice} />
    </>
  );
}

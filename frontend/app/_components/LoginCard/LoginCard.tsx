import { Suspense } from "react";
import Link from "next/link";
import { BrandLogo } from "@/app/_components/BrandLogo/BrandLogo";
import { PATHS } from "@/app/_lib/paths";
import { safeNextPath } from "@/lib/next-path";
import { LoginForm } from "../LoginForm/LoginForm";
import { ModalClose } from "../ModalClose/ModalClose";
import { SocialButtons } from "../SocialButtons/SocialButtons";
import styles from "./LoginCard.module.css";

type SearchParams = Promise<{ next?: string | string[] }>;

/**
 * 로그인 창. /login 페이지와, 화면 안에서 로그인을 눌렀을 때 뜨는 모달(@auth/(.)login)이 같이 쓴다.
 * 모달이면 닫기가 이전 화면으로 돌아가고, 페이지면 홈으로 간다.
 */
export function LoginCard({ searchParams, modal = false }: { searchParams: SearchParams; modal?: boolean }) {
  return (
    <section className={styles.card} aria-labelledby="login-title">
      <div className={styles.body}>
        <div className={styles.top}>
          <BrandLogo />
          {modal ? (
            <ModalClose className={styles.close}>
              <CloseIcon />
            </ModalClose>
          ) : (
            <Link href={PATHS.home} className={styles.close} aria-label="로그인 닫기">
              <CloseIcon />
            </Link>
          )}
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
        <Link href={PATHS.signup} className={styles.signup}>
          처음 오셨나요?
        </Link>
      </div>
    </section>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="m5 5 14 14M19 5 5 19" />
    </svg>
  );
}

/** 돌아갈 주소를 폼과 함께 그린다. 서버 액션이 주소를 다시 검사한다 */
async function Forms({ searchParams }: { searchParams: SearchParams }) {
  const next = safeNextPath((await searchParams).next);
  return (
    <>
      <LoginForm next={next} />
      <p className={styles.divider}>또는 소셜 계정으로</p>
      <SocialButtons next={next} />
    </>
  );
}

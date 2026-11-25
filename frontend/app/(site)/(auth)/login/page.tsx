import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/app/_components/BrandLogo/BrandLogo";
import { LoginForm } from "./_components/LoginForm/LoginForm";
import { SocialButtons } from "./_components/SocialButtons/SocialButtons";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "로그인" };

export default function LoginPage() {
  return (
    <div className={styles.screen}>
      {/* 홈을 구현하기 전까지 홈 목업을 배경으로 쓴다 */}
      <Image src="/images/login-backdrop.jpg" alt="" fill priority sizes="100vw" className={styles.backdrop} />
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
          <LoginForm />
          <p className={styles.divider}>또는 소셜 계정으로</p>
          <SocialButtons />
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

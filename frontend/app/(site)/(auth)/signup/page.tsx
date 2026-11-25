import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/app/_components/BrandLogo/BrandLogo";
import { SignupFlow } from "./_components/SignupFlow/SignupFlow";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "회원가입" };

export default function SignupPage() {
  return (
    <>
      <div className={styles.bar}>
        <BrandLogo />
        <p className={styles.login}>
          이미 회원이신가요?
          <Link href="/login" className={styles.link}>
            로그인
          </Link>
        </p>
      </div>
      <SignupFlow />
    </>
  );
}

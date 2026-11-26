"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import styles from "./LoginDialog.module.css";

/**
 * 보던 화면 위에 로그인 창을 모달로 띄운다. 네이티브 dialog라 포커스가 안에 머물고 Esc로 닫힌다.
 * 닫기는 뒤로 가기라 주소도 보던 화면으로 돌아간다.
 */
export function LoginDialog({ children }: { children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    return () => element.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="login-title"
      onCancel={(event) => {
        event.preventDefault();
        router.back();
      }}
      // 창 바깥(어두운 막)을 누르면 닫는다. 창 안을 누르면 대상이 dialog가 아니다
      onClick={(event) => {
        if (event.target === event.currentTarget) router.back();
      }}
    >
      {children}
    </dialog>
  );
}

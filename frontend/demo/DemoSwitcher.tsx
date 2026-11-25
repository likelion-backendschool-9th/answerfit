"use client";

import { useTransition } from "react";
import { switchMode, switchRole } from "./actions";
import type { DataMode, DemoRole } from "./rules";
import styles from "./DemoSwitcher.module.css";

/** 로컬·테스트 서버 푸터의 모드·역할 전환기. 역할은 목업 모드에서만 바꾼다 */
export function DemoSwitcher({ mode, role }: { mode: DataMode; role: DemoRole }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className={styles.switcher} aria-busy={pending}>
      <label className={styles.field}>
        데이터
        <select className={styles.select} value={mode} disabled={pending} onChange={(e) => startTransition(() => switchMode(e.target.value))}>
          <option value="mock">목업 데이터 모드</option>
          <option value="api">개발 모드 (실제 API)</option>
        </select>
      </label>
      {mode === "mock" && (
        <label className={styles.field}>
          역할
          <select className={styles.select} value={role} disabled={pending} onChange={(e) => startTransition(() => switchRole(e.target.value))}>
            <option value="guest">비회원</option>
            <option value="member">회원</option>
            <option value="admin">관리자</option>
          </select>
        </label>
      )}
    </div>
  );
}

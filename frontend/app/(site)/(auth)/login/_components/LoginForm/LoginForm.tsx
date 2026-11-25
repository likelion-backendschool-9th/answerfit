"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Checkbox } from "@/components/ui/Checkbox/Checkbox";
import { TextField } from "@/components/ui/TextField/TextField";
import { loginAction } from "@/features/auth/actions";
import styles from "./LoginForm.module.css";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(loginAction, {});
  const [notice, setNotice] = useState("");

  return (
    <form action={action} className={styles.form} noValidate>
      <input type="hidden" name="next" value={next} />
      <TextField label="이메일" name="email" type="email" autoComplete="username" placeholder="이메일 입력" defaultValue={state.email} autoFocus required />
      <TextField label="비밀번호" name="password" type="password" autoComplete="current-password" placeholder="비밀번호 입력" required />
      <div className={styles.options}>
        <Checkbox name="remember" defaultChecked={state.remember ?? true} key={String(state.remember)}>
          로그인 상태 유지
        </Checkbox>
        <button type="button" className={styles.forgot} onClick={() => setNotice("비밀번호 찾기는 준비 중이에요.")}>
          비밀번호 찾기
        </button>
      </div>
      <p className={styles.notice} role="status">
        {notice}
      </p>
      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "로그인 중" : "로그인"}
      </Button>
    </form>
  );
}

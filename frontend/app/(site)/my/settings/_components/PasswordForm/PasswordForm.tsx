"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button/Button";
import { TextField } from "@/components/ui/TextField/TextField";
import { changePasswordAction } from "@/features/member/actions";
import { passwordChangeErrors, type PasswordErrors } from "@/features/member/validation";
import { SettingsCard } from "../SettingsCard/SettingsCard";
import styles from "./PasswordForm.module.css";

const EMPTY = { current: "", next: "", confirm: "" };

export function PasswordForm() {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [pending, startTransition] = useTransition();
  const set = (name: keyof typeof EMPTY) => (event: React.ChangeEvent<HTMLInputElement>) => setValues({ ...values, [name]: event.target.value });

  function submit() {
    const found = passwordChangeErrors(values);
    setErrors(found);
    setMessage(undefined);
    if (Object.keys(found).length > 0) return;
    startTransition(async () => {
      const result = await changePasswordAction(values).catch(() => ({ ok: false, message: "바꾸지 못했어요. 다시 시도해 주세요.", errors: undefined }));
      setErrors(result.errors ?? {});
      if (result.ok) setValues(EMPTY);
      if (result.message) setMessage({ ok: result.ok, text: result.message });
    });
  }

  return (
    <SettingsCard title="비밀번호 변경" description="소셜 로그인으로만 가입했다면 비밀번호를 새로 만들 수 있어요.">
      <form
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <TextField label="현재 비밀번호" type="password" name="current" autoComplete="current-password" value={values.current} error={errors.current} onChange={set("current")} />
        <div className={styles.fields}>
          <TextField label="새 비밀번호" type="password" name="next" autoComplete="new-password" placeholder="8자 이상 입력" hint="영문 · 숫자를 섞어 8자 이상" value={values.next} error={errors.next} onChange={set("next")} />
          <TextField label="새 비밀번호 확인" type="password" name="confirm" autoComplete="new-password" placeholder="8자 이상 입력" value={values.confirm} error={errors.confirm} onChange={set("confirm")} />
        </div>
        <div className={styles.bottom}>
          <p className={message?.ok === false ? styles.error : styles.done} role="status">
            {message?.text}
          </p>
          <Button type="submit" variant="outline" className={styles.save} disabled={pending}>
            {pending ? "변경 중" : "비밀번호 변경"}
          </Button>
        </div>
      </form>
    </SettingsCard>
  );
}

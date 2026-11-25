"use client";

import { Button } from "@/components/ui/Button/Button";
import { TextField } from "@/components/ui/TextField/TextField";
import type { AccountErrors } from "@/features/auth/types";
import { Agreements } from "../Agreements/Agreements";
import { StepHeading } from "../StepHeading/StepHeading";
import styles from "./AccountStep.module.css";

export type AccountValues = { email: string; password: string; passwordConfirm: string; agreements: boolean[] };

type Props = {
  values: AccountValues;
  errors: AccountErrors;
  error?: string;
  pending: boolean;
  onChange: (values: AccountValues) => void;
  onSubmit: () => void;
};

export function AccountStep({ values, errors, error, pending, onChange, onSubmit }: Props) {
  const set = (name: "email" | "password" | "passwordConfirm") => (event: React.ChangeEvent<HTMLInputElement>) => onChange({ ...values, [name]: event.target.value });
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <StepHeading title="계정을 만들어 주세요" description="이메일이 로그인 아이디가 돼요." />
      <div className={styles.fields}>
        <TextField
          label="이메일"
          type="email"
          name="email"
          autoComplete="username"
          placeholder="이메일 입력"
          hint="로그인 아이디로 사용돼요"
          value={values.email}
          error={errors.email}
          onChange={set("email")}
        />
        <TextField
          label="비밀번호"
          type="password"
          name="password"
          autoComplete="new-password"
          placeholder="8자 이상 입력"
          hint="영문 · 숫자를 섞어 8자 이상"
          value={values.password}
          error={errors.password}
          onChange={set("password")}
        />
        <TextField
          label="비밀번호 확인"
          type="password"
          name="passwordConfirm"
          autoComplete="new-password"
          placeholder="한 번 더 입력"
          value={values.passwordConfirm}
          error={errors.passwordConfirm}
          onChange={set("passwordConfirm")}
        />
      </div>
      <Agreements checked={values.agreements} error={errors.agreements} onChange={(agreements) => onChange({ ...values, agreements })} />
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className={styles.next}>
        {pending ? "확인 중" : "다음"}
      </Button>
    </form>
  );
}

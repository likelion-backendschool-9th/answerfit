"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { TextField } from "@/components/ui/TextField/TextField";
import type { ProfileErrors } from "@/features/auth/types";
import { PHOTO_TYPES } from "@/features/auth/validation";
import { PhotoChoice } from "../PhotoChoice/PhotoChoice";
import { StepHeading } from "../StepHeading/StepHeading";
import styles from "./ProfileStep.module.css";

export type ProfileValues = { nickname: string; usePhoto: boolean; photo: File | null };

type Props = {
  values: ProfileValues;
  errors: ProfileErrors;
  error?: string;
  pending: boolean;
  onChange: (values: ProfileValues) => void;
  onBack: () => void;
  onSubmit: () => void;
};

export function ProfileStep({ values, errors, error, pending, onChange, onBack, onSubmit }: Props) {
  const preview = usePreview(values.photo);
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <StepHeading title="어떻게 불러 드릴까요?" description="닉네임과 프로필 사진은 마이페이지에서 언제든 바꿀 수 있어요." />
      <TextField
        label="닉네임"
        name="nickname"
        autoComplete="nickname"
        placeholder="닉네임 입력"
        hint="2~12자 · 면접 결과와 마이페이지에 표시돼요"
        value={values.nickname}
        error={errors.nickname}
        onChange={(event) => onChange({ ...values, nickname: event.target.value })}
      />
      <fieldset className={styles.photo}>
        <legend className={styles.legend}>프로필 사진</legend>
        <div className={styles.choices}>
          <PhotoChoice
            title="기본 로고 사용"
            description="사진이 없으면 ANSWERFIT 로고로 표시돼요"
            icon="person"
            checked={!values.usePhoto}
            onSelect={() => onChange({ ...values, usePhoto: false })}
          />
          <PhotoChoice
            title="사진 올리기"
            description={values.photo?.name ?? "JPG · PNG, 5MB 이하"}
            icon="camera"
            preview={preview}
            checked={values.usePhoto}
            onSelect={() => onChange({ ...values, usePhoto: true })}
          />
        </div>
        {values.usePhoto && (
          <label className={styles.file}>
            사진 파일
            <input type="file" accept={PHOTO_TYPES.join(",")} onChange={(event) => onChange({ ...values, photo: event.target.files?.[0] ?? null })} />
          </label>
        )}
        {errors.photo && (
          <p className={styles.error} role="alert">
            {errors.photo}
          </p>
        )}
      </fieldset>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.buttons}>
        <Button variant="outline" className={styles.back} onClick={onBack} disabled={pending}>
          이전
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "가입 중" : "가입 완료"}
        </Button>
      </div>
    </form>
  );
}

/** 고른 사진을 서버에 올리기 전에 보여 준다 */
function usePreview(photo: File | null) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!photo) return;
    const reader = new FileReader();
    reader.onload = () => setUrl(String(reader.result));
    reader.readAsDataURL(photo);
    return () => {
      reader.onload = null;
      setUrl(undefined);
    };
  }, [photo]);
  return url;
}

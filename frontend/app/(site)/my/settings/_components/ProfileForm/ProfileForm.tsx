"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { TextField } from "@/components/ui/TextField/TextField";
import { updateProfileAction } from "@/features/member/actions";
import { nicknameError, PHOTO_TYPES, photoError } from "@/features/member/validation";
import { SettingsCard } from "../SettingsCard/SettingsCard";
import styles from "./ProfileForm.module.css";

const DEFAULT_IMAGE = "/brand/logo-light.png";
type Errors = { nickname?: string; photo?: string };

export function ProfileForm({ nickname, email }: { nickname: string; email: string }) {
  const file = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(nickname);
  const [photo, setPhoto] = useState<File | null>(null);
  const [useDefault, setUseDefault] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [pending, startTransition] = useTransition();
  const preview = usePreview(photo);

  function submit() {
    const found: Errors = { nickname: nicknameError(draft.trim()), photo: photo ? photoError(photo) : undefined };
    setErrors(found);
    setMessage(undefined);
    if (found.nickname || found.photo) return;
    const form = new FormData();
    form.set("nickname", draft.trim());
    if (photo) form.set("photo", photo);
    if (useDefault) form.set("useDefault", "true");
    startTransition(async () => {
      const result = await updateProfileAction(form).catch(() => ({ ok: false, message: "저장하지 못했어요. 다시 시도해 주세요.", errors: undefined }));
      setErrors(result.errors ?? {});
      if (result.message) setMessage({ ok: result.ok, text: result.message });
    });
  }

  return (
    <SettingsCard title="프로필">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className={styles.photo}>
          <span className={styles.avatar}>
            {/* eslint-disable-next-line @next/next/no-img-element -- 아직 올리지 않은 파일이라 이미지 최적화를 쓸 수 없다 */}
            <img src={preview ?? DEFAULT_IMAGE} alt="프로필 사진" className={styles.image} />
            <span className={styles.camera}>
              <Icon name="camera" size={16} />
            </span>
          </span>
          <div>
            <div className={styles.photoButtons}>
              <Button variant="outline" className={styles.change} onClick={() => file.current?.click()}>
                사진 변경
              </Button>
              <Button
                variant="outline"
                className={styles.reset}
                onClick={() => {
                  setPhoto(null);
                  setUseDefault(true);
                  setErrors({ ...errors, photo: undefined });
                }}
              >
                기본 이미지로
              </Button>
            </div>
            <p className={styles.hint}>JPG · PNG, 5MB 이하 · 사진이 없으면 기본 로고가 보여요</p>
            <input
              ref={file}
              type="file"
              className={styles.file}
              aria-label="프로필 사진 파일"
              tabIndex={-1}
              accept={PHOTO_TYPES.join(",")}
              onChange={(event) => {
                const picked = event.target.files?.[0] ?? null;
                event.target.value = "";
                if (!picked) return;
                const problem = photoError(picked);
                setErrors({ ...errors, photo: problem });
                if (problem) return;
                setPhoto(picked);
                setUseDefault(false);
              }}
            />
            {errors.photo && (
              <p className={styles.error} role="alert">
                {errors.photo}
              </p>
            )}
          </div>
        </div>
        <div className={styles.fields}>
          <TextField label="닉네임" name="nickname" autoComplete="nickname" hint="2~12자 · 한글, 영문, 숫자" value={draft} error={errors.nickname} onChange={(event) => setDraft(event.target.value)} />
          <TextField label="이메일" type="email" value={email} readOnly hint="로그인 아이디로 쓰여서 바꿀 수 없어요" />
        </div>
        <div className={styles.bottom}>
          <p className={message?.ok === false ? styles.error : styles.done} role="status">
            {message?.text}
          </p>
          <Button type="submit" className={styles.save} disabled={pending}>
            {pending ? "저장 중" : "변경 사항 저장"}
          </Button>
        </div>
      </form>
    </SettingsCard>
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

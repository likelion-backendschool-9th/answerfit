"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button/Button";
import { SelectField } from "@/components/ui/SelectField/SelectField";
import { TextField } from "@/components/ui/TextField/TextField";
import { saveExperienceAction } from "@/features/experience/actions";
import { ACTIVITY_LABEL, emptyExperience, experienceError, LONG_MAX, SHORT_MAX, TITLE_MAX, titleError, toExperience } from "@/features/experience/rules";
import type { ActivityType, Experience } from "@/features/experience/types";
import { PeriodPicker } from "../PeriodPicker/PeriodPicker";
import { TagPicker } from "../TagPicker/TagPicker";
import styles from "./ExperienceForm.module.css";

type Props = {
  /** null이면 새 경험이다 */
  experience: Experience | null;
  custom: string[];
  /** 저장하거나 취소하면 이 주소로 간다(모바일 상세 화면) */
  backHref?: string;
  onSaved?: (experience: Experience) => void;
  onCancel?: () => void;
};

/** 경험의 모든 칸. 표에 없는 활동 내용은 여기서만 적는다 */
export function ExperienceForm({ experience, custom, backHref, onSaved, onCancel }: Props) {
  const router = useRouter();
  const id = useId();
  const [draft, setDraft] = useState(() => experience ?? emptyExperience(crypto.randomUUID()));
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const set = (patch: Partial<Experience>) => setDraft((current) => ({ ...current, ...patch }));

  function leave() {
    if (!backHref) return onCancel?.();
    router.push(backHref);
    router.refresh();
  }

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        const next = toExperience(draft);
        if (!next || experienceError(next)) return;
        startTransition(async () => {
          const result = await saveExperienceAction(next).catch(() => ({ error: "저장하지 못했어요. 다시 시도해 주세요." }));
          if (result.error) return setError(result.error);
          onSaved?.(next);
          if (backHref) leave();
        });
      }}
    >
      <div className={styles.body}>
        <TextField label="제목 *" value={draft.title} maxLength={TITLE_MAX} error={(touched && titleError(draft.title)) || undefined} onChange={(event) => set({ title: event.target.value })} />
        <div className={styles.field}>
          <span className={styles.label}>구분</span>
          <SelectField label="구분" value={draft.type ?? ""} options={{ "": "선택 안 함", ...ACTIVITY_LABEL }} onChange={(event) => set({ type: (event.target.value || null) as ActivityType | null })} />
        </div>
        <PeriodPicker value={draft} onChange={set} />
        <div className={styles.pair}>
          <TextField label="소속" value={draft.organization} maxLength={SHORT_MAX} onChange={(event) => set({ organization: event.target.value })} />
          <TextField label="역할" value={draft.role} maxLength={SHORT_MAX} onChange={(event) => set({ role: event.target.value })} />
        </div>
        <div className={styles.field}>
          <span className={styles.label}>태그</span>
          <TagPicker value={draft.tags} custom={custom} onChange={(tags) => set({ tags })} />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-content`} className={styles.label}>
            활동 내용
          </label>
          <textarea id={`${id}-content`} className={styles.textarea} rows={8} maxLength={LONG_MAX} placeholder="어떤 상황에서 무엇을 맡았고, 어떻게 행동했는지 적어요." value={draft.content} onChange={(event) => set({ content: event.target.value })} />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-result`} className={styles.label}>
            성과
          </label>
          <textarea id={`${id}-result`} className={styles.textarea} rows={4} maxLength={LONG_MAX} placeholder="숫자로 말할 수 있는 결과가 있으면 함께 적어요." value={draft.result} onChange={(event) => set({ result: event.target.value })} />
        </div>
      </div>
      <div className={styles.foot}>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <Button variant="outline" className={styles.button} onClick={leave} disabled={pending}>
          취소
        </Button>
        <Button type="submit" className={styles.button} disabled={pending}>
          {pending ? "저장 중…" : "저장"}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button/Button";
import { Chip } from "@/components/ui/Chip/Chip";
import { Icon } from "@/components/ui/Icon/Icon";
import { SelectField } from "@/components/ui/SelectField/SelectField";
import { TextField } from "@/components/ui/TextField/TextField";
import { saveExperienceAction } from "@/features/experience/actions";
import { ACTIVITY_LABEL, emptyExperience, emptyStory, experienceError, LONG_MAX, SHORT_MAX, STORIES_MAX, TITLE_MAX, titleError, toExperience } from "@/features/experience/rules";
import type { ActivityType, Experience, Story } from "@/features/experience/types";
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

/** 경험의 모든 칸. 아래쪽에서 같은 경험을 역량별로 나눠 적는다 */
export function ExperienceForm({ experience, custom, backHref, onSaved, onCancel }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState(() => experience ?? emptyExperience(crypto.randomUUID(), crypto.randomUUID()));
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const set = (patch: Partial<Experience>) => setDraft((current) => ({ ...current, ...patch }));
  const setStory = (id: string, patch: Partial<Story>) => setDraft((current) => ({ ...current, stories: current.stories.map((story) => (story.id === id ? { ...story, ...patch } : story)) }));

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
        <section className={styles.section} aria-label="경험 정보">
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
        </section>

        <section className={styles.section} aria-labelledby="stories-heading">
          <div className={styles.sectionHead}>
            <h3 id="stories-heading" className={styles.heading}>
              역량별로 나눠 쓰기 <span className={styles.count}>{draft.stories.length}</span>
            </h3>
            <p className={styles.hint}>같은 경험이라도 보여 줄 역량마다 행을 나눠 활동 내용과 성과를 따로 적어요.</p>
          </div>
          <ol className={styles.stories}>
            {draft.stories.map((story, index) => (
              <StoryFields
                key={story.id}
                story={story}
                index={index}
                custom={custom}
                removable={draft.stories.length > 1}
                onChange={(patch) => setStory(story.id, patch)}
                onRemove={() => set({ stories: draft.stories.filter(({ id }) => id !== story.id) })}
              />
            ))}
          </ol>
          <Button variant="outline" className={styles.addStory} disabled={draft.stories.length >= STORIES_MAX} onClick={() => set({ stories: [...draft.stories, emptyStory(crypto.randomUUID())] })}>
            <Icon name="plus" size={18} /> 역량 행 추가
          </Button>
        </section>
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

type StoryProps = { story: Story; index: number; custom: string[]; removable: boolean; onChange: (patch: Partial<Story>) => void; onRemove: () => void };

/** 역량 행 하나. 태그 선택기는 길어서 접어 둔다 */
function StoryFields({ story, index, custom, removable, onChange, onRemove }: StoryProps) {
  const id = useId();
  return (
    <li className={styles.story}>
      <div className={styles.storyHead}>
        <span className={styles.storyNumber}>역량 {index + 1}</span>
        <span className={styles.storyTags}>
          {story.tags.length > 0 ? (
            story.tags.map((tag) => (
              <Chip key={tag} size="sm">
                {tag}
              </Chip>
            ))
          ) : (
            <span className={styles.hint}>아직 역량 태그가 없어요</span>
          )}
        </span>
        {removable && (
          <button type="button" className={styles.remove} aria-label={`역량 ${index + 1} 삭제`} onClick={onRemove}>
            <Icon name="trash" size={18} />
          </button>
        )}
      </div>
      <details className={styles.picker}>
        <summary>역량 태그 고르기</summary>
        <TagPicker value={story.tags} custom={custom} onChange={(tags) => onChange({ tags })} />
      </details>
      <div className={styles.field}>
        <label htmlFor={`${id}-content`} className={styles.label}>
          활동 내용
        </label>
        <textarea id={`${id}-content`} className={styles.textarea} rows={6} maxLength={LONG_MAX} placeholder="이 역량이 드러난 상황, 맡은 일, 행동을 적어요." value={story.content} onChange={(event) => onChange({ content: event.target.value })} />
      </div>
      <div className={styles.field}>
        <label htmlFor={`${id}-result`} className={styles.label}>
          성과
        </label>
        <textarea id={`${id}-result`} className={styles.textarea} rows={3} maxLength={LONG_MAX} placeholder="숫자로 말할 수 있는 결과가 있으면 함께 적어요." value={story.result} onChange={(event) => onChange({ result: event.target.value })} />
      </div>
    </li>
  );
}

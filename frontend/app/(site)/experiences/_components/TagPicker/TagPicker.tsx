"use client";

import { useState } from "react";
import { FilterChips } from "@/components/ui/FilterChips/FilterChips";
import { myTags, TAG_GROUPS, TAG_MAX, TAGS_MAX } from "@/features/experience/rules";
import styles from "./TagPicker.module.css";

/** 고를 때마다 바로 바뀐다. custom은 다른 경험에서 만든 내 태그다 */
export function TagPicker({ value, custom, onChange }: { value: string[]; custom: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const full = value.length >= TAGS_MAX;
  const groups: [string, readonly string[]][] = [...Object.entries(TAG_GROUPS), ["내 태그", myTags([{ tags: custom }, { tags: value }])]];

  function toggle(tag: string) {
    if (value.includes(tag)) onChange(value.filter((item) => item !== tag));
    else if (!full) onChange([...value, tag]);
  }

  function add() {
    const tag = draft.trim().slice(0, TAG_MAX);
    if (tag && !value.includes(tag) && !full) onChange([...value, tag]);
    setDraft("");
  }

  return (
    <div className={styles.picker}>
      {groups.map(([name, tags]) =>
        tags.length > 0 ? (
          <div key={name}>
            <p className={styles.group}>{name}</p>
            <FilterChips label={`${name} 태그`} chips={tags.map((tag) => ({ label: tag, current: value.includes(tag), onSelect: () => toggle(tag) }))} />
          </div>
        ) : null,
      )}
      <div className={styles.add}>
        <input
          className={styles.input}
          aria-label="새 태그"
          placeholder={full ? `태그는 ${TAGS_MAX}개까지 달 수 있어요` : "새 태그 만들기"}
          value={draft}
          maxLength={TAG_MAX}
          disabled={full}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
            event.preventDefault();
            add();
          }}
        />
        <button type="button" className={styles.button} disabled={full || !draft.trim()} onClick={add}>
          추가
        </button>
      </div>
    </div>
  );
}

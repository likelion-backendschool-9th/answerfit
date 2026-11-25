"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { renameInterviewAction } from "@/features/interview/actions";
import { TITLE_MAX } from "@/features/interview/result";
import styles from "./TitleEditor.module.css";

export function TitleEditor({ id, title }: { id: string; title: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function close() {
    setDraft(null);
    setError(undefined);
  }

  if (draft === null) {
    return (
      <div className={styles.view}>
        <h1 className={styles.title}>{title}</h1>
        <button type="button" className={styles.edit} aria-label="제목 바꾸기" onClick={() => setDraft(title)}>
          <Icon name="pencil" size={20} />
        </button>
      </div>
    );
  }

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await renameInterviewAction(id, draft);
          if (result.error) setError(result.error);
          else close();
        });
      }}
      onKeyDown={(event) => event.key === "Escape" && close()}
    >
      <input className={styles.input} aria-label="면접 제목" aria-invalid={error ? true : undefined} value={draft} maxLength={TITLE_MAX * 2} autoFocus onChange={(event) => setDraft(event.target.value)} />
      <Button type="submit" className={styles.button} disabled={pending}>
        저장
      </Button>
      <Button variant="outline" className={styles.button} onClick={close} disabled={pending}>
        취소
      </Button>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

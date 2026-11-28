"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { importExperiencesAction } from "@/features/experience/actions";
import { parsePasted } from "@/features/experience/rules";
import type { Experience } from "@/features/experience/types";
import styles from "./PasteImport.module.css";

type Props = { open: boolean; onClose: () => void; onImported: (items: Experience[]) => void };

export function PasteImport({ open, onClose, onImported }: Props) {
  return (
    <Modal open={open} title="붙여넣기로 가져오기" description="엑셀이나 구글 시트에서 행을 복사해 붙여 넣으세요. 열 순서는 표와 같아요: 제목, 구분, 기간, 소속, 역할, 태그(쉼표로 나눔), 성과." onClose={onClose}>
      <Form onClose={onClose} onImported={onImported} />
    </Modal>
  );
}

function Form({ onClose, onImported }: Omit<Props, "open">) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  // 미리보기는 개수만 센다. 아이디는 가져올 때 만든다
  const preview = parsePasted(text, () => "");

  return (
    <div className={styles.form}>
      <textarea className={styles.textarea} aria-label="붙여 넣을 표" rows={10} placeholder={"제목\t구분\t기간\t소속\t역할\t태그\t성과"} value={text} autoFocus onChange={(event) => setText(event.target.value)} />
      <p className={styles.summary} role="status">
        {text.trim() && `${preview.items.length}개를 가져와요.`}
        {preview.skipped > 0 && ` 제목이 없는 ${preview.skipped}줄은 건너뛰어요.`}
      </p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.buttons}>
        <Button variant="outline" className={styles.button} onClick={onClose} disabled={pending}>
          취소
        </Button>
        <Button
          className={styles.button}
          disabled={pending || preview.items.length === 0}
          onClick={() =>
            startTransition(async () => {
              const { items } = parsePasted(text, () => crypto.randomUUID());
              const result = await importExperiencesAction(items).catch(() => ({ error: "가져오지 못했어요. 다시 시도해 주세요." }));
              if (result.error) return setError(result.error);
              onImported(items);
              onClose();
            })
          }
        >
          {pending ? "가져오는 중…" : "가져오기"}
        </Button>
      </div>
    </div>
  );
}

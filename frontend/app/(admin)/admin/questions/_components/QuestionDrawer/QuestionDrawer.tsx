"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { generateAnswerAction, removeBankAction, saveBankAction } from "@/features/admin/actions";
import { ANSWER_MAX, categoriesOf, type DraftErrors } from "@/features/admin/rules";
import type { BankQuestion, QuestionDraft } from "@/features/admin/types";
import type { QuestionKind } from "@/features/question/types";
import { ConfirmDialog } from "../../../_components/ConfirmDialog/ConfirmDialog";
import { KeywordField } from "../KeywordField/KeywordField";
import styles from "./QuestionDrawer.module.css";

/** question이 없으면 등록이다 */
type Props = { open: boolean; question: BankQuestion | null; onClose: () => void };

export function QuestionDrawer({ open, question, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    if (!element || !open) return;
    element.showModal();
    return () => element.close();
  }, [open]);

  return (
    <>
      <dialog
        ref={dialog}
        className={styles.drawer}
        aria-label={question ? "질문 수정" : "질문 등록"}
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
      >
        {open && <Form question={question} onClose={onClose} onRemove={() => setRemoving(true)} />}
      </dialog>
      <ConfirmDialog
        open={removing}
        title="질문을 삭제할까요?"
        description="삭제하면 아카이브에서도 사라지고 되돌릴 수 없어요."
        action="삭제하기"
        run={() => removeBankAction(question ? [question.id] : [])}
        onClose={() => setRemoving(false)}
        onDone={onClose}
      />
    </>
  );
}

const KINDS: [QuestionKind, string][] = [
  ["cs", "CS"],
  ["personality", "인성"],
];
const EMPTY: QuestionDraft = { kind: "cs", category: "", text: "", answer: "", keywords: [] };

function Form({ question, onClose, onRemove }: { question: BankQuestion | null; onClose: () => void; onRemove: () => void }) {
  const [draft, setDraft] = useState<QuestionDraft>(question ? { kind: question.kind, category: question.category, text: question.text, answer: question.answer, keywords: question.keywords } : EMPTY);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [message, setMessage] = useState<string>();
  const [saving, startSaving] = useTransition();
  const [generating, startGenerating] = useTransition();
  const length = [...draft.answer].length;

  function change(part: Partial<QuestionDraft>) {
    setDraft((before) => ({ ...before, ...part }));
    setErrors((before) => Object.fromEntries(Object.entries(before).filter(([name]) => !(name in part))));
    setMessage(undefined);
  }

  function generate() {
    startGenerating(async () => {
      const result = await generateAnswerAction(draft.text).catch(() => ({ error: "모범답안을 만들지 못했어요. 다시 시도해 주세요." }));
      if ("error" in result) setMessage(result.error);
      else change(result);
    });
  }

  function save() {
    startSaving(async () => {
      const result: Awaited<ReturnType<typeof saveBankAction>> = await saveBankAction(question?.id ?? null, draft).catch(() => ({ error: "저장하지 못했어요. 다시 시도해 주세요." }));
      if (result.errors) return setErrors(result.errors);
      if (result.error) return setMessage(result.error);
      onClose();
    });
  }

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <div className={styles.top}>
        <div>
          {question && (
            <p className={styles.eyebrow}>
              {question.code} · {question.source ? `사용자 ${question.source}` : "관리자"} 등록 · 좋아요 {question.likes}
            </p>
          )}
          <h2 className={styles.title}>{question ? "질문 수정" : "질문 등록"}</h2>
        </div>
        <button type="button" className={styles.close} aria-label="닫기" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      <div className={styles.body}>
        <fieldset className={styles.field}>
          <legend className={styles.label}>
            분류 <Required />
          </legend>
          <div className={styles.kinds}>
            {KINDS.map(([kind, label]) => (
              <label key={kind} className={styles.kind}>
                <input type="radio" name="kind" className={styles.radio} checked={draft.kind === kind} onChange={() => change({ kind, category: "" })} />
                {label}
              </label>
            ))}
          </div>
          <div className={styles.chips} role="radiogroup" aria-label="카테고리">
            {categoriesOf(draft.kind).map((name) => (
              <label key={name} className={styles.chip}>
                <input type="radio" name="category" className={styles.radio} checked={draft.category === name} onChange={() => change({ category: name })} />
                {name}
              </label>
            ))}
          </div>
          <FieldError text={errors.category} />
        </fieldset>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="drawer-text">
            질문 <Required />
          </label>
          <textarea id="drawer-text" className={styles.textarea} rows={2} value={draft.text} aria-invalid={errors.text ? true : undefined} onChange={(event) => change({ text: event.target.value })} />
          <FieldError text={errors.text} />
        </div>
        <div className={styles.field}>
          <div className={styles.row}>
            <label className={styles.label} htmlFor="drawer-answer">
              모범답안 <Required />
            </label>
            <button type="button" className={styles.generate} disabled={generating} onClick={generate}>
              <Icon name="spinner" size={14} /> {generating ? "만드는 중" : draft.answer ? "AI로 다시 만들기" : "AI로 만들기"}
            </button>
          </div>
          <textarea id="drawer-answer" className={`${styles.textarea} ${styles.answer}`} value={draft.answer} disabled={generating} aria-invalid={errors.answer ? true : undefined} onChange={(event) => change({ answer: event.target.value })} />
          <p className={length > ANSWER_MAX ? styles.over : styles.count}>
            {length} / {ANSWER_MAX.toLocaleString("ko-KR")}
          </p>
          <FieldError text={errors.answer} />
        </div>
        <div className={styles.field}>
          <p className={styles.label}>핵심 키워드</p>
          <p className={styles.hint}>면접 답변에 이 키워드가 빠지면 꼬리 질문을 만들어요.</p>
          <KeywordField keywords={draft.keywords} onChange={(keywords) => change({ keywords })} />
          <FieldError text={errors.keywords} />
        </div>
      </div>
      <div className={styles.bottom}>
        {message && (
          <p className={styles.message} role="alert">
            {message}
          </p>
        )}
        {question && (
          <button type="button" className={styles.remove} disabled={saving} onClick={onRemove}>
            <Icon name="trash" size={16} /> 질문 삭제
          </button>
        )}
        <Button variant="outline" className={styles.cancel} onClick={onClose} disabled={saving}>
          취소
        </Button>
        <Button variant="accent" type="submit" className={styles.save} disabled={saving || generating}>
          {saving ? "저장 중" : "저장"}
        </Button>
      </div>
    </form>
  );
}

function Required() {
  return <span className={styles.required}>*</span>;
}

function FieldError({ text }: { text?: string }) {
  return (
    text && (
      <p className={styles.error} role="alert">
        {text}
      </p>
    )
  );
}

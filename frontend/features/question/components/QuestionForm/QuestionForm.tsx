"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { saveQuestionAction, similarAction } from "@/features/question/actions";
import { questionHref } from "@/features/question/paths";
import { CS_CATEGORIES, questionError, TEXT_MAX } from "@/features/question/rules";
import type { SimilarQuestion } from "@/features/question/types";
import styles from "./QuestionForm.module.css";

const SIMILAR_DELAY_MS = 500;

type Props = { id: string | null; initial?: { category: string; text: string }; onCancel: () => void; onDone: () => void };

/** 등록과 수정이 함께 쓴다. id가 없으면 등록이다 */
export function QuestionForm({ id, initial, onCancel, onDone }: Props) {
  const [category, setCategory] = useState(initial?.category ?? "");
  const [text, setText] = useState(initial?.text ?? "");
  const [similar, setSimilar] = useState<SimilarQuestion | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const length = [...text].length;

  // 입력을 멈추면 비슷한 질문을 찾는다
  useEffect(() => {
    let left = false;
    const timer = setTimeout(async () => {
      const found = text.trim() ? await similarAction(text).catch(() => null) : null;
      if (!left) setSimilar(found);
    }, SIMILAR_DELAY_MS);
    return () => {
      left = true;
      clearTimeout(timer);
    };
  }, [text]);

  function submit() {
    const problem = questionError({ category, text: text.trim() });
    setError(problem);
    if (problem) return;
    startTransition(async () => {
      const result = await saveQuestionAction(id, { category, text }).catch(() => ({ error: "저장하지 못했어요. 다시 시도해 주세요." }));
      if (result.error) setError(result.error);
      else onDone();
    });
  }

  return (
    <form
      onChange={() => setError(undefined)}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <fieldset className={styles.field}>
        <legend className={styles.label}>
          카테고리 <span className={styles.required}>*</span>
        </legend>
        <div className={styles.chips}>
          {CS_CATEGORIES.map((name) => (
            <label key={name} className={styles.chip}>
              <input type="radio" name="category" className={styles.radio} checked={category === name} onChange={() => setCategory(name)} />
              {name}
            </label>
          ))}
        </div>
      </fieldset>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="question-text">
          질문 <span className={styles.required}>*</span>
        </label>
        <div className={styles.box}>
          <textarea id="question-text" className={styles.textarea} rows={3} placeholder="질문 입력" value={text} aria-describedby="question-hint" onChange={(event) => setText(event.target.value)} />
          <span className={length > TEXT_MAX ? styles.over : styles.count}>
            {length} / {TEXT_MAX}
          </span>
        </div>
        <p id="question-hint" className={styles.hint}>
          면접관이 실제로 물어볼 문장으로 써 주세요. 모범답안은 승인 후 AI가 만들어요.
        </p>
      </div>
      {similar && (
        <Link href={questionHref(similar.id)} className={styles.similar} onClick={onCancel}>
          <Icon name="search" size={20} />
          <span className={styles.similarText}>
            <span className={styles.similarTitle}>비슷한 질문이 이미 있어요</span>
            <span className={styles.similarQuestion}>{similar.text}</span>
          </span>
          <Icon name="chevron" size={16} />
        </Link>
      )}
      <p className={styles.rule}>
        <Icon name="lock" size={16} /> 승인 전에는 마이페이지 › 내가 올린 질문에서 수정 · 삭제할 수 있어요. 승인 후에는 바꿀 수 없어요. 인성 질문은 관리자만 등록해요.
      </p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.buttons}>
        <Button variant="outline" onClick={onCancel} disabled={pending}>
          취소
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중" : id ? "수정하기" : "등록하기"}
        </Button>
      </div>
    </form>
  );
}

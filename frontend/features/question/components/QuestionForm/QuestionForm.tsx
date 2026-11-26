"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { loadQuestionCategoriesAction, saveQuestionAction, similarAction } from "@/features/question/actions";
import { questionHref } from "@/features/question/paths";
import { questionError, TEXT_MAX } from "@/features/question/rules";
import type { QuestionCategoryOption, SimilarResult } from "@/features/question/types";
import styles from "./QuestionForm.module.css";

const SIMILAR_DELAY_MS = 500;

type Props = { id: string | null; initial?: { categoryId?: string | null; category: string; text: string }; onCancel: () => void; onDone: (id: string) => void };

/** 등록과 수정이 함께 쓴다. id가 없으면 등록이다 */
export function QuestionForm({ id, initial, onCancel, onDone }: Props) {
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [categories, setCategories] = useState<QuestionCategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryError, setCategoryError] = useState<string>();
  const [reload, setReload] = useState(0);
  const [text, setText] = useState(initial?.text ?? "");
  const [suggestion, setSuggestion] = useState<({ input: string } & SimilarResult) | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const submitting = useRef(false);
  const length = [...text].length;
  const similar = suggestion?.input === text ? suggestion.question : null;
  const similarError = suggestion?.input === text ? suggestion.error : undefined;

  useEffect(() => {
    let cancelled = false;
    loadQuestionCategoriesAction().then((result) => {
      if (cancelled) return;
      setCategories(result.categories);
      setCategoryError(result.error);
      const selected = initial?.categoryId
        ? result.categories.find(({ id }) => id === initial.categoryId)
        : result.categories.find(({ name }) => name === initial?.category);
      setCategoryId((current) => result.categories.some(({ id }) => id === current) ? current : selected?.id ?? "");
    }).catch(() => {
      if (!cancelled) setCategoryError("카테고리를 불러오지 못했어요. 다시 시도해 주세요.");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [initial?.categoryId, initial?.category, reload]);

  // 입력을 멈추면 비슷한 질문을 찾는다
  useEffect(() => {
    let left = false;
    const timer = setTimeout(async () => {
      const result: SimilarResult = text.trim() ? await similarAction(text).catch(() => ({ question: null, error: "유사 질문을 확인하지 못했어요." })) : { question: null };
      if (!left) setSuggestion({ input: text, ...result });
    }, SIMILAR_DELAY_MS);
    return () => {
      left = true;
      clearTimeout(timer);
    };
  }, [text]);

  function submit() {
    if (submitting.current || loading || categoryError) return;
    const problem = questionError({ categoryId, text: text.trim() });
    setError(problem);
    if (problem) return;
    submitting.current = true;
    startTransition(async () => {
      try {
        const result = await saveQuestionAction(id, { categoryId, text }).catch(() => ({ error: "저장하지 못했어요. 다시 시도해 주세요.", id: undefined }));
        if (result.error) setError(result.error);
        else if (result.id) onDone(result.id);
        else setError("저장 결과를 확인하지 못했어요. 질문 목록을 확인해 주세요.");
      } finally { submitting.current = false; }
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
          {categories.map(({ id, name }) => (
            <label key={id} className={styles.chip}>
              <input type="radio" name="category" value={id} className={styles.radio} checked={categoryId === id} disabled={pending} onChange={() => setCategoryId(id)} />
              {name}
            </label>
          ))}
        </div>
        {loading && <p role="status">카테고리를 불러오고 있어요.</p>}
        {!loading && !categoryError && categories.length === 0 && <p role="status">등록할 수 있는 CS 카테고리가 없어요.</p>}
        {categoryError && <p className={styles.error} role="alert">{categoryError} <button type="button" onClick={() => {
          setCategoryError(undefined); setLoading(true); setReload((value) => value + 1);
        }}>다시 불러오기</button></p>}
      </fieldset>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="question-text">
          질문 <span className={styles.required}>*</span>
        </label>
        <div className={styles.box}>
          <textarea id="question-text" className={styles.textarea} rows={3} placeholder="질문 입력" value={text} disabled={pending} aria-describedby="question-hint" onChange={(event) => setText(event.target.value)} />
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
      {similarError && <p className={styles.hint} role="status">유사 질문 조회: {similarError} 질문 등록은 계속할 수 있어요.</p>}
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
        <Button type="submit" disabled={pending || loading || Boolean(categoryError) || categories.length === 0}>
          {pending ? "저장 중" : id ? "수정하기" : "등록하기"}
        </Button>
      </div>
    </form>
  );
}

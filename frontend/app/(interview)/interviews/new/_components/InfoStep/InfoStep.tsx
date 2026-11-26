"use client";

import { ChoiceCard } from "@/components/ui/ChoiceCard/ChoiceCard";
import { COUNTS } from "@/features/interview/setup";
import type { DocumentGroup, InterviewSetup } from "@/features/interview/types";
import { DocumentSection } from "../DocumentSection/DocumentSection";
import { Section } from "../Section/Section";
import styles from "./InfoStep.module.css";

type Props = { setup: InterviewSetup; groups: DocumentGroup[]; today: string; onChange: (setup: InterviewSetup) => void };

const locked = () => undefined;

export function InfoStep({ setup, groups, today, onChange }: Props) {
  const set = (change: Partial<InterviewSetup>) => onChange({ ...setup, ...change });
  return (
    <>
      <Section title="진행 방식">
        <div className={styles.grid} role="radiogroup" aria-label="진행 방식">
          <ChoiceCard name="mode" icon="bulb" title="연습 모드" description="시간 제한 없음 · 힌트 보기 · 꼬리 질문 직접 선택" checked={setup.mode === "practice"} onSelect={() => set({ mode: "practice" })} />
          <ChoiceCard name="mode" icon="timer" title="실전 모드" description="답변당 1~2분 · 힌트 없음 · 꼬리 질문 자동 진행" checked={setup.mode === "real"} onSelect={() => set({ mode: "real" })} />
        </div>
      </Section>
      <Section title="면접 유형" description="어떤 면접을 연습할지 골라 주세요.">
        <div className={styles.grid} role="radiogroup" aria-label="면접 유형">
          <ChoiceCard name="type" icon="file" title="경험 면접" description="직무기술서 역량 × 자소서로 만든 프로젝트 심층 질문" checked={setup.type === "experience"} onSelect={() => set({ type: "experience" })} />
          <ChoiceCard name="type" icon="message" title="CS 면접" description="OS · 네트워크 · DB 문제 은행 + 답변 따라 꼬리 질문" checked={setup.type === "cs"} onSelect={() => set({ type: "cs" })} />
          <ChoiceCard name="type" icon="users" title="인성 · 컬쳐핏 면접" description="곧 열려요" state="locked" checked={false} onSelect={locked} />
          <ChoiceCard name="type" icon="chart" title="PT 면접" description="곧 열려요" state="locked" checked={false} onSelect={locked} />
        </div>
      </Section>
      <Section title="질문 수" description="3~8개 중에서 골라 주세요. 꼬리 질문은 개수에 포함되지 않아요.">
        <div className={styles.counts} role="radiogroup" aria-label="질문 수">
          {COUNTS.map((count) => (
            <label key={count} className={styles.count}>
              <input type="radio" name="count" className={styles.input} checked={setup.count === count} onChange={() => set({ count })} />
              {count}
            </label>
          ))}
        </div>
      </Section>
      {setup.type === "experience" && <DocumentSection setup={setup} groups={groups} today={today} onChange={set} />}
    </>
  );
}

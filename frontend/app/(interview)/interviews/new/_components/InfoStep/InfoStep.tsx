"use client";

import { ChoiceCard } from "@/components/ui/ChoiceCard/ChoiceCard";
import type { IconName } from "@/components/ui/Icon/Icon";
import { COUNTS, needsDocuments, TYPE_LABEL } from "@/features/interview/setup";
import type { DocumentGroup, InterviewSetup, InterviewType } from "@/features/interview/types";
import { DocumentSection } from "../DocumentSection/DocumentSection";
import { KeepDateField } from "../KeepDateField/KeepDateField";
import { Section } from "../Section/Section";
import styles from "./InfoStep.module.css";

type Props = { setup: InterviewSetup; groups: DocumentGroup[]; today: string; onChange: (setup: InterviewSetup) => void };

const TYPES: { type: InterviewType; icon: IconName; description: string }[] = [
  { type: "experience", icon: "file", description: "자소서 · 직무기술서로 만든 심층 질문" },
  { type: "cs", icon: "message", description: "문제 은행 질문 + 답변 따라 꼬리 질문" },
  { type: "personality", icon: "users", description: "가치관 · 협업 경험을 묻는 인성 질문" },
  { type: "pt", icon: "chart", description: "IT 기사 골라 20분 준비 → 5분 발표 → 질문" },
];

export function InfoStep({ setup, groups, today, onChange }: Props) {
  const set = (change: Partial<InterviewSetup>) => onChange({ ...setup, ...change });
  return (
    <>
      <Section title="진행 방식">
        <div className={styles.modes} role="radiogroup" aria-label="진행 방식">
          <ChoiceCard name="mode" icon="bulb" title="연습 모드" description="시간 제한 없음 · 힌트 보기 · 꼬리 질문 직접 선택" checked={setup.mode === "practice"} onSelect={() => set({ mode: "practice" })} />
          <ChoiceCard name="mode" icon="timer" title="실전 모드" description="답변당 1~2분 · 힌트 없음 · 꼬리 질문 자동 진행" checked={setup.mode === "real"} onSelect={() => set({ mode: "real" })} />
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
      <Section title="면접 유형" description="어떤 면접을 연습할지 골라 주세요.">
        <div className={styles.types} role="radiogroup" aria-label="면접 유형">
          {TYPES.map(({ type, icon, description }) => (
            <ChoiceCard key={type} name="type" icon={icon} title={TYPE_LABEL[type]} description={description} checked={setup.type === type} onSelect={() => set({ type })} />
          ))}
        </div>
      </Section>
      <Section title="영상 보관 기간" description="이날이 지나면 녹화 영상이 삭제돼요. 실제 면접 기간으로 선택하세요.">
        <KeepDateField value={setup.deleteAfter} today={today} onChange={(deleteAfter) => set({ deleteAfter })} />
      </Section>
      {needsDocuments(setup.type) && <DocumentSection setup={setup} groups={groups} onChange={set} />}
    </>
  );
}

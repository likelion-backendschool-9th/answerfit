"use client";

import { useState } from "react";
import { ChoiceCard } from "@/components/ui/ChoiceCard/ChoiceCard";
import { Icon } from "@/components/ui/Icon/Icon";
import { TYPE_LABEL } from "@/features/interview/setup";
import type { DocumentGroup, InterviewSetup } from "@/features/interview/types";
import { Section } from "../Section/Section";
import styles from "./DocumentSection.module.css";

type Props = { setup: InterviewSetup; groups: DocumentGroup[]; onChange: (change: Partial<InterviewSetup>) => void };

export function DocumentSection({ setup, groups, onChange }: Props) {
  const [notice, setNotice] = useState("");
  return (
    <div className={styles.panel}>
      <p className={styles.reason}>
        <Icon name="file" size={20} /> {TYPE_LABEL[setup.type]}을 골라서 아래 서류 정보가 필요해요.
      </p>
      <Section
        title="서류 그룹"
        description={
          <>
            자기소개서와 직무기술서로 질문을 만들어요.
            <br />한 번 등록한 그룹은 다음 면접에도 그대로 쓸 수 있어요.
          </>
        }
      >
        <div className={styles.groups} role="radiogroup" aria-label="서류 그룹">
          {groups.map(({ id, name, description, interviewDate, error }) => (
            <ChoiceCard
              key={id}
              name="group"
              icon="folder"
              title={name}
              description={error ? `오류 · ${error}` : description}
              state={error ? "error" : undefined}
              checked={setup.groupId === id}
              onSelect={() => onChange({ groupId: id, deleteAfter: interviewDate })}
            />
          ))}
          <button type="button" className={styles.add} onClick={() => setNotice("새 서류 그룹 등록은 준비 중이에요.")}>
            <span className={styles.addTitle}>
              <Icon name="plus" size={20} /> 새 서류 그룹 등록
            </span>
            <span className={styles.addDescription}>PDF 업로드 · 링크 · 텍스트 붙여넣기</span>
          </button>
          <p className={styles.notice} role="status">
            {notice}
          </p>
        </div>
      </Section>
    </div>
  );
}

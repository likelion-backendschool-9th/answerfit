import type { ReactNode } from "react";
import Link from "next/link";
import { PATHS } from "@/app/_lib/paths";
import { Icon } from "@/components/ui/Icon/Icon";
import type { RecordType } from "@/features/interview/types";
import { SectionHeading } from "../SectionHeading/SectionHeading";
import styles from "./RoomsSection.module.css";

const FACTS = ["질문 3~8개 선택", "연습 · 실전 모드", "TTS 질문 · 음성 답변"];

const ROOMS: { type: RecordType; title: string; description: string; tags: string[]; art: ReactNode }[] = [
  {
    type: "experience",
    title: "경험 면접",
    description: "직무기술서에서 기업이 원하는 역량을 뽑고, 내 자소서 경험을 그 역량 중심으로 파고들어요.",
    tags: ["서류 필요", "꼬리 질문"],
    art: <DocumentsArt />,
  },
  {
    type: "cs",
    title: "CS 면접",
    description: "OS · 네트워크 · DB 문제 은행에서 출제하고, 빠진 핵심 키워드는 꼬리 질문으로 다시 물어요.",
    tags: ["문제 은행", "꼬리 질문"],
    art: <TerminalArt />,
  },
  {
    type: "personality",
    title: "인성 면접",
    description: "엄선된 인성 · 컬처핏 질문으로 태도와 가치관을 말로 정리하는 연습을 해요.",
    tags: ["문제 은행", "컬처핏"],
    art: <ChatArt />,
  },
  {
    type: "pt",
    title: "PT 면접",
    description: "IT 기사 3개 중 하나를 골라 20분 준비, 5분 발표, 질의응답까지 실전 그대로.",
    tags: ["준비 20분", "발표 5분"],
    art: <PresentationArt />,
  },
];

/** 면접 유형별 입장. 누르면 그 유형을 고른 채로 면접 준비 화면을 연다 */
export function RoomsSection() {
  return (
    <section id="rooms" className={styles.section} aria-labelledby="rooms-title">
      <div className={styles.inner}>
        <div className={styles.top}>
          <SectionHeading
            id="rooms-title"
            eyebrow="01 — ROOMS"
            title="오늘 들어갈 면접실을 고르세요"
            description="직무기술서와 자소서, 문제 은행을 바탕으로 AI 면접관이 질문을 만듭니다."
          />
          <ul className={styles.facts}>
            {FACTS.map((fact) => (
              <li key={fact} className={styles.pill}>
                {fact}
              </li>
            ))}
          </ul>
        </div>
        <ul className={styles.rooms}>
          {ROOMS.map(({ type, title, description, tags, art }, i) => (
            <li key={type} className={styles.room}>
              <p className={styles.number}>ROOM 0{i + 1}</p>
              <div className={styles.art} aria-hidden="true">
                {art}
              </div>
              <h3 className={styles.title}>{title}</h3>
              <p className={styles.description}>{description}</p>
              <ul className={styles.tags}>
                {tags.map((tag) => (
                  <li key={tag} className={styles.pill}>
                    {tag}
                  </li>
                ))}
              </ul>
              <Link href={{ pathname: PATHS.newInterview, query: { type } }} className={styles.enter}>
                {title} 입장 <Icon name="arrow" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* 카드 그림. 선은 글자색, 강조는 포인트색이다 */
const LINE = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function DocumentsArt() {
  return (
    <svg viewBox="0 0 80 64" width="80" height="64">
      <rect x="14" y="6" width="36" height="46" rx="3" {...LINE} />
      <rect x="26" y="12" width="36" height="46" rx="3" {...LINE} fill="var(--color-surface)" />
      <path d="M33 22h22M33 29h22M33 36h14" {...LINE} />
      <circle cx="60" cy="52" r="7" {...LINE} fill="var(--color-surface)" stroke="var(--color-accent)" />
      <path d="m57 52 2 2 4-4" {...LINE} stroke="var(--color-accent)" />
    </svg>
  );
}

function TerminalArt() {
  return (
    <svg viewBox="0 0 80 64" width="80" height="64">
      <rect x="6" y="10" width="68" height="44" rx="4" {...LINE} />
      <path d="M6 19h68M12 14.5h.01M17 14.5h.01M22 14.5h.01" {...LINE} />
      <path d="m14 30 6 5-6 5M25 40h10M44 30h22M44 36h16M44 42h20" {...LINE} />
    </svg>
  );
}

function ChatArt() {
  return (
    <svg viewBox="0 0 80 64" width="80" height="64">
      <path d="M8 10h36a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H22l-8 7v-7H8a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4Z" {...LINE} />
      <path d="M13 19h24M13 25h16" {...LINE} />
      <path d="M36 28h32a4 4 0 0 1 4 4v14a4 4 0 0 1-4 4h-4v7l-8-7H36a4 4 0 0 1-4-4V32a4 4 0 0 1 4-4Z" {...LINE} fill="var(--color-surface)" stroke="var(--color-accent)" />
      <path d="M40 36h22M40 42h14" {...LINE} stroke="var(--color-accent)" />
    </svg>
  );
}

function PresentationArt() {
  return (
    <svg viewBox="0 0 80 64" width="80" height="64">
      <rect x="6" y="8" width="56" height="38" rx="3" {...LINE} />
      <path d="M34 46v8M24 56h20M14 36l10-10 8 6 12-12 8 6" {...LINE} />
      <circle cx="64" cy="46" r="9" {...LINE} fill="var(--color-surface)" stroke="var(--color-accent)" />
      <path d="M64 41v5l3 2" {...LINE} stroke="var(--color-accent)" />
    </svg>
  );
}

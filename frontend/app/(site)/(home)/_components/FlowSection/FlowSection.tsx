import Link from "next/link";
import { Waveform } from "@/app/_components/Waveform/Waveform";
import { PATHS } from "@/app/_lib/paths";
import { Icon } from "@/components/ui/Icon/Icon";
import { Chip } from "@/components/ui/Chip/Chip";
import { cn } from "@/lib/cn";
import { SectionHeading } from "../SectionHeading/SectionHeading";
import styles from "./FlowSection.module.css";

const WAVE = [8, 14, 22, 34, 24, 34, 52, 40, 28, 48, 58, 46, 30, 18, 34, 48, 32, 22, 14, 26, 18, 10, 16, 8];

const STEPS = [
  {
    title: "준비 — 한 화면에서 끝",
    description: "면접 유형과 모드, 질문 수를 고르고 서류와 카메라 · 마이크를 확인해요. 페이지를 넘기지 않아요.",
    preview: <SettingsPreview />,
  },
  {
    title: "말하기 — 질문에만 집중",
    description: "AI 면접관이 질문을 소리 내어 읽고, 말로 답하면 바로 글로 옮겨져요. 부족한 답에는 꼬리 질문이 이어져요.",
    preview: <AnswerPreview />,
  },
  {
    title: "피드백 — 숫자와 문장으로",
    description: "답변 정확도, 시선 처리, 답변 시간을 점수로 보여주고 질문마다 총평 · 심화 키워드 · 면접관 팁을 남겨요.",
    preview: <ScorePreview />,
  },
];

export function FlowSection() {
  return (
    <section id="flow" className={styles.section} aria-labelledby="flow-title">
      <div className={styles.inner}>
        <div className={styles.top}>
          <SectionHeading
            id="flow-title"
            eyebrow="02 — FLOW"
            title="준비부터 피드백까지, 한 번의 흐름으로"
            description="설정 · 서류 · 장치 확인은 한 화면에서 끝내고, 면접이 시작되면 질문에만 집중하세요."
          />
          <Link href={PATHS.guide} className={styles.more}>
            진행 방식 자세히 보기 <Icon name="arrow" />
          </Link>
        </div>
        <ol className={styles.steps}>
          {STEPS.map(({ title, description, preview }, i) => (
            <li key={title}>
              <p className={styles.step}>STEP 0{i + 1}</p>
              <div className={styles.card} aria-hidden="true">
                {preview}
              </div>
              <h3 className={styles.stepTitle}>{title}</h3>
              <p className={styles.description}>{description}</p>
            </li>
          ))}
        </ol>
        <div className={styles.modes}>
          <article className={styles.mode}>
            <p className={styles.modeLabel}>PRACTICE</p>
            <h3 className={styles.modeTitle}>연습 모드 — 천천히, 충분히</h3>
            <ul className={styles.points}>
              <li>시간 제한 없이 생각하고 답하기</li>
              <li>막히면 힌트 보기</li>
              <li>꼬리 질문으로 갈지 다음 질문으로 갈지 직접 선택</li>
            </ul>
          </article>
          <article className={cn(styles.mode, styles.real)}>
            <p className={styles.modeLabel}>
              REAL <Chip tone="dark">추천</Chip>
            </p>
            <h3 className={styles.modeTitle}>실전 모드 — 실제 면접처럼</h3>
            <ul className={styles.points}>
              <li>답변당 1~2분 타이머 · 힌트 없음</li>
              <li>꼬리 질문은 AI 면접관이 판단해 바로 이어감</li>
              <li>최대 3개 유형을 순서대로 묶어 한 번에 진행</li>
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}

function SettingsPreview() {
  const rows = [
    { label: "유형", options: ["경험", "CS", "인성"], selected: "경험" },
    { label: "모드", options: ["연습", "실전"], selected: "실전" },
    { label: "질문 수", options: ["3", "5", "8"], selected: "5" },
  ];
  return (
    <div className={styles.settings}>
      {rows.map(({ label, options, selected }) => (
        <div key={label} className={styles.row}>
          <span className={styles.label}>{label}</span>
          <span className={styles.segments}>
            {options.map((option) => (
              <span key={option} className={cn(styles.segment, option === selected && styles.selected)}>
                {option}
              </span>
            ))}
          </span>
        </div>
      ))}
      <div className={styles.chips}>
        <Chip>카메라 확인됨</Chip>
        <Chip>마이크 확인됨</Chip>
      </div>
    </div>
  );
}

function AnswerPreview() {
  return (
    <div className={styles.answer}>
      <Waveform bars={WAVE} className={styles.wave} />
      <span className={styles.time}>01:12 / 02:00</span>
      <Chip>꼬리 질문이 생성됐어요</Chip>
    </div>
  );
}

function ScorePreview() {
  const scores = [
    { label: "답변 정확도", className: styles.accuracy },
    { label: "시선 처리", className: styles.gaze },
    { label: "답변 시간", className: styles.duration },
  ];
  return (
    <div className={styles.score}>
      <p className={styles.total}>
        <strong className={styles.totalNumber}>82</strong> 종합 점수
      </p>
      {scores.map(({ label, className }) => (
        <div key={label} className={styles.scoreRow}>
          <span>{label}</span>
          <span className={styles.track}>
            <span className={cn(styles.fill, className)} />
          </span>
        </div>
      ))}
    </div>
  );
}

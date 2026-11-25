import { Icon, type IconName } from "@/components/ui/Icon/Icon";
import type { InterviewMode } from "@/features/interview/types";
import styles from "./ProcessGuide.module.css";

const steps = (mode: InterviewMode): { icon: IconName; title: string; description: string }[] => [
  { icon: "speaker", title: "질문 듣기", description: "면접관 목소리로 질문을 읽어 줘요" },
  { icon: "mic", title: "말로 답변", description: mode === "practice" ? "시간 제한 없이 답해요 · 막히면 힌트" : "2분 안에 답해요 · 힌트 없음" },
  { icon: "spinner", title: "AI 분석", description: "답변을 정리하고 꼬리 질문을 판단해요" },
  mode === "practice"
    ? { icon: "skip", title: "다음 선택", description: "꼬리 질문을 받을지 직접 골라요" }
    : { icon: "skip", title: "자동 진행", description: "꼬리 질문이나 다음 질문으로 이어져요" },
];

export function ProcessGuide({ mode }: { mode: InterviewMode }) {
  return (
    <ol className={styles.list}>
      {steps(mode).map(({ icon, title, description }, i) => (
        <li key={title} className={styles.item}>
          <span className={styles.icon}>
            <Icon name={icon} />
          </span>
          <p className={styles.title}>
            {i + 1}&nbsp; {title}
          </p>
          <p className={styles.description}>{description}</p>
        </li>
      ))}
    </ol>
  );
}

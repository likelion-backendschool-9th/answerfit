import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { deleteLabel, estimateMinutes, MODE_LABEL, TYPE_LABEL } from "@/features/interview/setup";
import type { DocumentGroup, InterviewSetup } from "@/features/interview/types";
import styles from "./SummaryCard.module.css";

type Actions = { next: () => void } | { start: () => void; back: () => void; pending: boolean; ready: boolean };
type Props = { setup: InterviewSetup; group: DocumentGroup | null; error?: string; children: Actions };

export function SummaryCard({ setup, group, error, children: actions }: Props) {
  const practice = setup.mode === "practice";
  return (
    <aside className={styles.card} aria-labelledby="summary-title">
      <h2 id="summary-title" className={styles.title}>
        면접 요약
      </h2>
      <dl className={styles.rows}>
        <Row label="진행 방식" value={MODE_LABEL[setup.mode]} />
        <Row label="면접 유형" value={TYPE_LABEL[setup.type]} />
        <Row label="질문 수" value={`${setup.count}개`} />
        <Row label="예상 소요" value={`약 ${estimateMinutes(setup.count)}분`} />
        {setup.type === "experience" && <Row label="서류 그룹" value={group?.shortName ?? "고르지 않음"} muted />}
        <Row label="영상 삭제" value={deleteLabel(setup.deleteAfter)} muted />
      </dl>
      <p className={styles.note}>
        <Icon name={practice ? "bulb" : "timer"} />
        {practice ? "연습 모드 · 시간 제한 없음 · 힌트 보기 가능" : "실전 모드 · 답변당 2분 · 힌트 없음"}
      </p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {"next" in actions ? (
        <Button onClick={actions.next}>다음 · 환경 점검</Button>
      ) : (
        <div className={styles.buttons}>
          <Button onClick={actions.start} disabled={actions.pending || !actions.ready}>
            {actions.pending ? "준비 중" : "면접 시작하기"}
          </Button>
          <Button variant="outline" onClick={actions.back} disabled={actions.pending}>
            이전 단계
          </Button>
        </div>
      )}
    </aside>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={styles.row}>
      <dt className={styles.label}>{label}</dt>
      <dd className={muted ? styles.mutedValue : styles.value}>{value}</dd>
    </div>
  );
}

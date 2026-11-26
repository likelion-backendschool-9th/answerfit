"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { recordingUrl } from "@/features/interview/recordings";
import { daysUntil, mainItems, rateScore, startedLabel, summarize, totalDuration, type InterviewResult } from "@/features/interview/result";
import { RECORD_LABEL } from "@/features/interview/records";
import { MODE_LABEL } from "@/features/interview/setup";
import { cn } from "@/lib/cn";
import { ScoreRing } from "../ScoreRing/ScoreRing";
import { SectionLabel } from "../SectionLabel/SectionLabel";
import { TitleEditor } from "../TitleEditor/TitleEditor";
import styles from "./ResultHeader.module.css";

function deleteNotice(deleteAfter: string, today: string) {
  const days = daysUntil(deleteAfter, today);
  if (days < 0) return "녹화 영상이 삭제됐어요";
  return `녹화 영상 ${deleteAfter.slice(5).replace("-", ".")} 자동 삭제 ${days === 0 ? "D-DAY" : `D-${days}`}`;
}

export function ResultHeader({ result, today }: { result: InterviewResult; today: string }) {
  const [notice, setNotice] = useState("");
  const { items } = result;
  const followUps = items.length - mainItems(items).length;
  const { score } = summarize(items);
  const rating = rateScore(score);
  const total = items.reduce((sum, { seconds }) => sum + seconds, 0);

  function downloadAll() {
    const found = items.flatMap(({ id, label }) => {
      const url = recordingUrl(result.id, id);
      return url ? [{ url, label }] : [];
    });
    setNotice(found.length === 0 ? "이 탭에서 녹화한 영상이 없어요. 영상 저장은 아직 준비 중이에요." : `영상 ${found.length}개를 내려받아요.`);
    for (const { url, label } of found) {
      const link = document.createElement("a");
      link.href = url;
      link.download = `${result.title} ${label}.webm`;
      link.click();
    }
  }

  const chips = [
    result.groupName,
    RECORD_LABEL[result.type],
    MODE_LABEL[result.mode],
    `질문 ${items.length}개${followUps > 0 ? ` (꼬리 질문 ${followUps}개 포함)` : ""}`,
    startedLabel(result.startedAt),
    `총 ${totalDuration(total)}`,
  ].filter((chip) => chip !== null);

  return (
    <header className={styles.header}>
      <div className={styles.info}>
        <SectionLabel number="01">면접 정보</SectionLabel>
        <TitleEditor id={result.id} title={result.title} />
        <ul className={styles.chips}>
          {chips.map((chip) => (
            <li key={chip} className={styles.chip}>
              {chip}
            </li>
          ))}
        </ul>
        <div className={styles.buttons}>
          <Button variant="outline" className={styles.button} onClick={() => window.print()}>
            PDF로 저장
          </Button>
          <Button variant="outline" className={styles.button} onClick={downloadAll}>
            영상 모두 내려받기
          </Button>
          <p className={styles.delete}>
            <Icon name="trash" size={16} /> {deleteNotice(result.deleteAfter, today)}
          </p>
        </div>
        <p className={styles.notice} role="status">
          {notice}
        </p>
      </div>
      <div className={styles.total}>
        <ScoreRing score={score} large />
        <div>
          <p className={styles.totalName}>종합 점수</p>
          <p className={cn(styles.rating, styles[rating.tone])}>{rating.label}</p>
          <p className={styles.totalNote}>{items.length}개 문항 평균 · 80점 이상이면 우수</p>
        </div>
      </div>
    </header>
  );
}

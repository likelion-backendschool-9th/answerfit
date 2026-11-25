"use client";

import { useState } from "react";
import Link from "next/link";
import { PATHS } from "@/app/_lib/paths";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { recordingUrl } from "@/features/interview/recordings";
import { daysUntil, mainItems, startedLabel, type InterviewResult } from "@/features/interview/result";
import { RECORD_LABEL } from "@/features/interview/records";
import { MODE_LABEL } from "@/features/interview/setup";
import { TitleEditor } from "../TitleEditor/TitleEditor";
import styles from "./ResultHeader.module.css";

function deleteNotice(deleteAfter: string, today: string) {
  const days = daysUntil(deleteAfter, today);
  if (days < 0) return { text: "녹화 영상이 삭제됐어요", dday: null };
  return { text: `녹화 영상 ${deleteAfter.replaceAll("-", ".")} 자동 삭제`, dday: days === 0 ? "D-DAY" : `D-${days}` };
}

export function ResultHeader({ result, today }: { result: InterviewResult; today: string }) {
  const [notice, setNotice] = useState("");
  const { items } = result;
  const mains = mainItems(items).length;
  const followUps = items.length - mains;
  const { text, dday } = deleteNotice(result.deleteAfter, today);

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

  return (
    <header>
      <nav aria-label="현재 위치" className={styles.crumb}>
        <Link href={PATHS.newInterview}>모의 면접</Link> › <span aria-current="page">면접 결과</span>
      </nav>
      <div className={styles.top}>
        <TitleEditor id={result.id} title={result.title} />
        <div className={styles.buttons}>
          <Button variant="outline" className={styles.button} onClick={() => window.print()}>
            PDF로 저장
          </Button>
          <Button variant="outline" className={styles.button} onClick={downloadAll}>
            영상 모두 내려받기
          </Button>
        </div>
      </div>
      <div className={styles.bottom}>
        <ul className={styles.meta}>
          {result.groupName && <li className={styles.group}>{result.groupName}</li>}
          <li>{startedLabel(result.startedAt)}</li>
          <li>
            {RECORD_LABEL[result.type]} · {MODE_LABEL[result.mode]}
          </li>
          <li>
            질문 {mains}개{followUps > 0 && ` + 꼬리 질문 ${followUps}개`}
          </li>
        </ul>
        <p className={styles.delete}>
          <Icon name="trash" size={16} /> {text} {dday && <span className={styles.dday}>{dday}</span>}
        </p>
      </div>
      <p className={styles.notice} role="status">
        {notice}
      </p>
    </header>
  );
}

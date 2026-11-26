import { duration, mainItems, rateScore, rateTime, startedLabel, summarize, timeNote, type InterviewResult } from "@/features/interview/result";
import { RECORD_LABEL } from "@/features/interview/records";
import { MODE_LABEL } from "@/features/interview/setup";
import styles from "./PrintReport.module.css";

/** 인쇄(PDF로 저장)할 때만 보인다. 꼬리 질문까지 모든 질문을 담는다 */
export function PrintReport({ result }: { result: InterviewResult }) {
  const { items } = result;
  const summary = summarize(items);
  const followUps = items.length - mainItems(items).length;
  return (
    <div className={styles.report}>
      <h1>{result.title}</h1>
      <p>{[result.groupName, startedLabel(result.startedAt), RECORD_LABEL[result.type], MODE_LABEL[result.mode], `질문 ${items.length - followUps}개 + 꼬리 질문 ${followUps}개`].filter(Boolean).join(" · ")}</p>
      <p>
        답변 평균 {summary.score}점({rateScore(summary.score).label}) · 시선 처리 평균 {summary.gaze}점({rateScore(summary.gaze).label}) · 답변 평균 시간 {duration(summary.seconds)}({rateTime(summary.seconds).label})
      </p>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>질문</th>
            <th>종합</th>
            <th>정확도</th>
            <th>시선</th>
            <th>시간</th>
          </tr>
        </thead>
        <tbody>
          {items.map(({ id, label, title, score, accuracy, gaze, seconds }) => (
            <tr key={id}>
              <td>
                {label} {title}
              </td>
              <td>{score}</td>
              <td>{accuracy}</td>
              <td>{gaze}</td>
              <td>{duration(seconds)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.map((item) => (
        <section key={item.id} className={styles.item}>
          <h2>
            {item.label}. {item.text}
          </h2>
          <h3>내 답변</h3>
          <p>{item.transcript}</p>
          <h3>총평</h3>
          <p>{item.comment}</p>
          {item.keywordChecks.length > 0 && <p>핵심 키워드: {item.keywordChecks.map(({ keyword, said }) => `${said ? "✓" : "✗"} ${keyword}`).join(", ")}</p>}
          <p>심화 학습 키워드: {item.keywords.join(", ")}</p>
          <p>면접관 팁: {item.tip}</p>
          <p>
            전달 방식: {item.gazeNote} · {timeNote(item.seconds)}
          </p>
        </section>
      ))}
    </div>
  );
}

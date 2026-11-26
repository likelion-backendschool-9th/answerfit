import { Icon } from "@/components/ui/Icon/Icon";
import type { ArchiveQuestion, ModelAnswer as Answer } from "@/features/question/types";
import styles from "./ModelAnswer.module.css";

type Props = { answer: Answer | null; pending: boolean; rejected?: boolean; answerStatus?: ArchiveQuestion["answerStatus"] };

export function ModelAnswer({ answer, pending, rejected = false, answerStatus }: Props) {
  return (
    <section className={styles.section} aria-labelledby="answer-title">
      <h2 id="answer-title" className={styles.title}>
        모범답안
      </h2>
      {answer ? <Content answer={answer} /> : <Empty pending={pending} rejected={rejected} answerStatus={answerStatus} />}
    </section>
  );
}

function Content({ answer: { summary, table, body, keywords } }: { answer: Answer }) {
  return (
    <>
      <div className={styles.summary}>
        <p className={styles.summaryText}>{summary}</p>
      </div>
      {table && (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                {table.head.map((cell) => (
                  <th key={cell} scope="col">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map(([name, ...cells]) => (
                <tr key={name}>
                  <th scope="row">{name}</th>
                  {cells.map((cell, i) => (
                    <td key={i}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {body && <p className={styles.body}>{body}</p>}
      <h3 className={styles.keywordTitle}>핵심 키워드</h3>
      {keywords.length > 0 ? (
        <>
          <p className={styles.note}>모의 면접에서 이 키워드가 답변에 빠지면 꼬리 질문이 나올 수 있어요.</p>
          <ul className={styles.keywords}>
            {keywords.map((keyword) => (
              <li key={keyword} className={styles.keyword}>
                {keyword}
              </li>
            ))}
          </ul>
        </>
      ) : <p className={styles.note}>등록된 핵심 키워드가 없어요.</p>}
    </>
  );
}

function Empty({ pending, rejected, answerStatus }: Omit<Props, "answer">) {
  const title = rejected ? "반려된 질문은 아직 모범답안이 없어요"
    : pending ? "아직 모범답안이 없어요"
      : answerStatus === "PENDING" ? "모범답안을 생성하고 있어요"
        : answerStatus === "FAILED" ? "모범답안 생성에 실패했어요"
          : "등록된 모범답안이 없어요";
  const description = rejected ? "질문을 수정해 다시 제출하고, 관리자 승인을 받으면 AI가 모범답안을 만들어요."
    : pending ? "관리자가 승인하면 질문이 아카이브에 공개되고 AI가 모범답안과 핵심 키워드를 만들어요."
      : answerStatus === "PENDING" ? "완성된 답안과 핵심 키워드를 여기에 보여 드려요."
        : answerStatus === "FAILED" ? "아직 답안을 확인할 수 없어요. 나중에 다시 확인해 주세요."
          : "모범답안이 등록되면 여기에 표시돼요.";
  return (
    <div className={styles.empty}>
      <span className={styles.icon}>
        <Icon name={answerStatus === "FAILED" ? "alert" : "file"} />
      </span>
      <p className={styles.emptyTitle}>{title}</p>
      <p className={styles.note}>{description}</p>
    </div>
  );
}

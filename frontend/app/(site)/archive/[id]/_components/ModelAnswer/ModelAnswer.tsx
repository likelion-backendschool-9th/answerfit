import { Icon } from "@/components/ui/Icon/Icon";
import type { ModelAnswer as Answer } from "@/features/question/types";
import styles from "./ModelAnswer.module.css";

export function ModelAnswer({ answer }: { answer: Answer | null }) {
  return (
    <section className={styles.section} aria-labelledby="answer-title">
      <h2 id="answer-title" className={styles.title}>
        모범답안
      </h2>
      {answer ? <Content answer={answer} /> : <Empty />}
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
      <p className={styles.body}>{body}</p>
      <h3 className={styles.keywordTitle}>핵심 키워드</h3>
      <p className={styles.note}>모의 면접에서 이 키워드가 답변에 빠지면 꼬리 질문이 나올 수 있어요.</p>
      <ul className={styles.keywords}>
        {keywords.map((keyword) => (
          <li key={keyword} className={styles.keyword}>
            {keyword}
          </li>
        ))}
      </ul>
    </>
  );
}

function Empty() {
  return (
    <>
      <p className={styles.note}>승인되면 AI가 자동으로 만들어요</p>
      <div className={styles.empty}>
        <span className={styles.icon}>
          <Icon name="file" />
        </span>
        <p className={styles.emptyTitle}>아직 모범답안이 없어요</p>
        <p className={styles.note}>관리자가 승인하면 AI가 모범답안과 핵심 키워드를 만들어 여기에 보여 드려요.</p>
      </div>
    </>
  );
}

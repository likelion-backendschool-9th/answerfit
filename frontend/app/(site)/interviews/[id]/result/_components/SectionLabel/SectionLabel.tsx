import styles from "./SectionLabel.module.css";

/** "01 면접 정보"처럼 번호를 붙인 구역 이름 */
export function SectionLabel({ number, children, id }: { number: string; children: string; id?: string }) {
  return (
    <h2 id={id} className={styles.label}>
      <span className={styles.number}>{number}</span> {children}
    </h2>
  );
}

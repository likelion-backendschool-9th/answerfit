import type { ReactNode } from "react";
import styles from "./SiteFooter.module.css";

/** 푸터 목업이 없어 지금은 전환기 자리만 있다. 서버 전용 코드를 넣지 않는다 */
export function SiteFooter({ children }: { children?: ReactNode }) {
  return <footer className={styles.footer}>{children}</footer>;
}

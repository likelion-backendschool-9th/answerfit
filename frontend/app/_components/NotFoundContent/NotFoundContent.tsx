import { ButtonLink } from "@/components/ui/Button/Button";
import styles from "./NotFoundContent.module.css";

export function NotFoundContent() {
  return (
    <div className={styles.content}>
      <h1 className={styles.title}>아직 없는 화면이에요</h1>
      <p className={styles.description}>주소가 잘못됐거나 준비 중인 화면이에요.</p>
      <ButtonLink href="/">홈으로 가기</ButtonLink>
    </div>
  );
}

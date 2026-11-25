import { PATHS } from "@/app/_lib/paths";
import { ButtonLink } from "@/components/ui/Button/Button";
import styles from "./DoneStep.module.css";

/** 면접과 마이페이지를 구현하기 전까지 두 주소는 준비 중 화면으로 간다 */
export function DoneStep({ nickname }: { nickname: string }) {
  return (
    <div>
      <span className={styles.badge}>
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10.25" />
          <path d="m8.5 12.5 2.5 2.5 4.5-5" />
        </svg>
      </span>
      <h1 className={styles.title} tabIndex={-1}>
        가입이 끝났어요, {nickname}님
      </h1>
      <p className={styles.description}>이제 카메라를 켜고 말로 답하는 첫 모의 면접을 시작해 보세요.</p>
      <div className={styles.card}>
        <span className={styles.icon}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="1.75" y="5.75" width="14" height="12.5" rx="2" />
            <path d="m15.75 10 6.5-3.5v11l-6.5-3.5" />
          </svg>
        </span>
        <span className={styles.text}>
          <strong className={styles.cardTitle}>녹화 영상 보관 안내</strong>
          <span className={styles.cardDescription}>면접마다 입력한 기업 면접 날짜가 지나면 영상이 자동 삭제돼요</span>
        </span>
      </div>
      <div className={styles.buttons}>
        <ButtonLink href={PATHS.newInterview}>첫 모의 면접 시작</ButtonLink>
        <ButtonLink href={PATHS.my} variant="outline">
          마이페이지로 가기
        </ButtonLink>
      </div>
    </div>
  );
}

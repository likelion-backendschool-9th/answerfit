import { PATHS } from "@/app/_lib/paths";
import { ArrowIcon } from "@/components/ui/ArrowIcon/ArrowIcon";
import { ButtonLink } from "@/components/ui/Button/Button";
import styles from "./ClosingSection.module.css";

export function ClosingSection() {
  return (
    <section className={styles.section} aria-labelledby="closing-title">
      <p className={styles.eyebrow}>READY WHEN YOU ARE</p>
      <h2 id="closing-title" className={styles.title}>
        면접 전날 밤, 한 번 더 말해보세요.
      </h2>
      <p className={styles.description}>
        질문을 눈으로 읽는 것과 소리 내어 답하는 것은 전혀 다른 연습이에요.
        <br />
        카메라를 켜고, 실제처럼 시작하세요.
      </p>
      <div className={styles.buttons}>
        <ButtonLink href={PATHS.newInterview} size="lg">
          지금 면접 시작하기 <ArrowIcon />
        </ButtonLink>
        <ButtonLink href={PATHS.archive} size="lg" variant="outline">
          질문 아카이브 보기
        </ButtonLink>
      </div>
    </section>
  );
}

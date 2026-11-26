import Image from "next/image";
import { PATHS } from "@/app/_lib/paths";
import { ButtonLink } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { cn } from "@/lib/cn";
import styles from "./HomeHero.module.css";

const FEATURES = [
  { icon: "mic", title: "음성으로 답변", description: "실제 면접처럼 소리 내어 말하기" },
  { icon: "message", title: "꼬리 질문", description: "내 답변에 맞춘 추가 질문" },
  { icon: "chart", title: "즉시 리포트", description: "항목별 강점과 개선점" },
] as const;

const TAGS = ["#트러블슈팅", "#협업", "#성능 개선"];

/** 홈 첫 화면. 로그인 화면의 배경으로도 쓴다. 헤더(TopBar)는 스크롤을 따라오도록 이 영역 밖, 페이지 맨 위에 둔다 */
export function HomeHero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.badge}>
            <span className={styles.badgeLabel}>
              <Icon name="mic" /> AI MOCK INTERVIEW
            </span>
            읽는 연습은 끝, 이제 말로 답할 차례
          </p>
          <h1 id="hero-title" className={styles.title}>
            실전처럼 말하고,
            <br />
            <span className={styles.accent}>바로 피드백</span> 받으세요.
          </h1>
          <p className={styles.lead}>
            카메라를 켜고 AI 면접관의 질문에 소리 내어 답해 보세요.
            <br />
            답변이 끝나는 순간 구조 · 키워드 · 전달력까지 분석해 드립니다.
          </p>
          <div className={styles.buttons}>
            <ButtonLink href={PATHS.newInterview} size="lg">
              카메라 켜고 면접 시작 <Icon name="arrow" />
            </ButtonLink>
            <ButtonLink href="#flow" size="lg" variant="outline">
              면접 방식 둘러보기
            </ButtonLink>
          </div>
          <p className={styles.note}>회원가입 후 바로 시작 · 녹화 영상은 분석 후 본인만 볼 수 있어요</p>
          <ul className={styles.features}>
            {FEATURES.map(({ icon, title, description }) => (
              <li key={title} className={styles.feature}>
                <span className={styles.featureIcon}>
                  <Icon name={icon} />
                </span>
                <span>
                  <strong className={styles.featureTitle}>{title}</strong>
                  <span className={styles.featureText}>{description}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* 면접 화면 예시. 읽을 내용이 아니라 장식이다 */}
        <div className={styles.visual} aria-hidden="true">
          <div className={styles.photoBox}>
            <Image src="/images/hero.png" alt="" fill priority sizes="(max-width: 64rem) 100vw, 40rem" className={styles.photo} />
            <span className={styles.rec}>REC 연습 모드 · 질문 2 / 5</span>
          </div>
          <div className={cn(styles.card, styles.questionCard)}>
            <p className={styles.cardLabel}>
              <Icon name="message" /> AI 면접관
            </p>
            <p className={styles.cardText}>
              프로젝트에서 가장 어려웠던 문제와
              <br />
              해결 과정을 말씀해 주세요.
            </p>
          </div>
          <div className={cn(styles.card, styles.reportCard)}>
            <div className={styles.reportHead}>
              <p className={styles.reportTitle}>
                <Icon name="check" /> 답변 분석 완료
              </p>
              <p className={styles.reportTime}>답변 1분 42초</p>
            </div>
            <ul className={styles.checks}>
              <li className={styles.good}>
                <Icon name="check" /> 결론부터 말해 답변 구조가 명확해요
              </li>
              <li className={styles.warn}>
                <Icon name="alert" /> 해결 결과를 수치로 덧붙이면 더 설득력 있어요
              </li>
            </ul>
            <ul className={styles.tags}>
              {TAGS.map((tag) => (
                <li key={tag} className={styles.tag}>
                  {tag}
                </li>
              ))}
            </ul>
            <div className={styles.followUp}>
              <p className={styles.cardLabel}>
                <Icon name="message" /> 이어지는 꼬리 질문
              </p>
              <p className={styles.cardText}>
                그 과정에서 팀원과 의견이 달랐다면,
                <br />
                어떻게 조율하셨나요?
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

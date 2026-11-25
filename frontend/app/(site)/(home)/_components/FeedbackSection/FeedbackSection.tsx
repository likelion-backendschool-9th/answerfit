import { FaceDots } from "@/app/_components/FaceDots/FaceDots";
import { Chip } from "@/components/ui/Chip/Chip";
import { cn } from "@/lib/cn";
import { SectionHeading } from "../SectionHeading/SectionHeading";
import styles from "./FeedbackSection.module.css";

/** 결과 화면을 미리 보여 주는 예시. 누를 수 있는 것은 없다 */
export function FeedbackSection() {
  return (
    <section className={styles.section} aria-labelledby="feedback-title">
      <div className={styles.inner}>
        <SectionHeading
          dark
          id="feedback-title"
          eyebrow="03 — FEEDBACK"
          title="말한 그대로, 숫자와 문장으로 돌려받으세요"
          description="면접이 끝나면 AI가 답변 내용과 전달 방식을 함께 분석해요. 녹화 영상으로 내 모습을 다시 확인할 수 있어요."
        />
        <div className={styles.grid}>
          <div>
            <div className={styles.video}>
              <div className={styles.videoTop}>
                <p className={styles.question}>
                  <span className={styles.number}>Q 02</span> 트랜잭션 격리 수준을 설명해 주세요
                </p>
                <span className={styles.download} aria-hidden="true">
                  영상 다운로드
                </span>
              </div>
              <FaceDots eyes="gaze" className={styles.face} />
              <div className={styles.timeline} aria-hidden="true">
                <span className={styles.played} />
                <span className={cn(styles.away, styles.first)} />
                <span className={cn(styles.away, styles.second)} />
                <span className={cn(styles.away, styles.third)} />
              </div>
              <div className={styles.videoBottom}>
                <p className={styles.legend}>시선 이탈 구간 3곳</p>
                <p className={styles.time}>01:18 / 02:14</p>
              </div>
            </div>
            <p className={styles.notice}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 11V7.5a5 5 0 0 1 10 0V11M4 11h16v10H4z" />
              </svg>
              이 영상은 기업 면접일(12월 3일)이 지나면 자동으로 삭제돼요. 필요하면 미리 내려받으세요.
            </p>
          </div>
          <div className={styles.result}>
            <div className={cn(styles.card, styles.total)}>
              <div>
                <p className={styles.label}>종합 점수</p>
                <p className={styles.score}>
                  <strong className={styles.number82}>82</strong> / 100
                </p>
              </div>
              <Chip tone="dark">지난 회차보다 +6</Chip>
            </div>
            <dl className={styles.tiles}>
              <div className={cn(styles.card, styles.tile)}>
                <dt className={styles.label}>답변 정확도</dt>
                <dd className={cn(styles.value, styles.good)}>
                  86<span className={styles.state}>준수</span>
                </dd>
              </div>
              <div className={cn(styles.card, styles.tile)}>
                <dt className={styles.label}>시선 처리</dt>
                <dd className={cn(styles.value, styles.normal)}>
                  78<span className={styles.state}>정면 78%</span>
                </dd>
              </div>
              <div className={cn(styles.card, styles.tile)}>
                <dt className={styles.label}>평균 답변 시간</dt>
                <dd className={cn(styles.value, styles.slow)}>
                  02:14<span className={styles.state}>느림</span>
                </dd>
              </div>
            </dl>
            <div className={cn(styles.card, styles.comments)}>
              <div>
                <h3 className={styles.commentTitle}>총평</h3>
                <p>개념 정의는 정확했어요. 다만 격리 수준별로 어떤 이상 현상이 생기는지 예시 없이 넘어가 꼬리 질문이 이어졌어요.</p>
              </div>
              <div>
                <h3 className={styles.commentTitle}>심화 학습 키워드</h3>
                <p className={styles.keywords}>
                  <Chip tone="dark">Dirty Read</Chip>
                  <Chip tone="dark">Phantom Read</Chip>
                  <Chip tone="dark">MVCC</Chip>
                </p>
              </div>
              <div>
                <h3 className={styles.commentTitle}>면접관 팁</h3>
                <p>&quot;정의 → 문제 상황 → 해결&quot; 순서로 30초 안에 말하면, 실전 2분 답변에서 여유가 생겨요.</p>
              </div>
            </div>
          </div>
        </div>
        <p className={styles.footnote}>※ 예시 화면입니다. 점수 기준은 팀 평가 기준 자료를 따릅니다.</p>
      </div>
    </section>
  );
}

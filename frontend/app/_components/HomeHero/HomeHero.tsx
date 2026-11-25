import Image from "next/image";
import { PATHS } from "@/app/_lib/paths";
import { ButtonLink } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { FaceDots } from "../FaceDots/FaceDots";
import { SiteHeader } from "../SiteHeader/SiteHeader";
import { Waveform } from "../Waveform/Waveform";
import styles from "./HomeHero.module.css";

const WAVE = [4, 12, 18, 8, 16, 6, 14, 4];

/** 홈 첫 화면. 로그인 화면의 배경으로도 쓴다 */
export function HomeHero({ backdrop = false }: { backdrop?: boolean }) {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <Image src="/images/hero.jpg" alt="" fill priority sizes="100vw" className={styles.photo} />
      <div className={styles.header}>
        <SiteHeader backdrop={backdrop} />
      </div>
      <div className={styles.content}>
        <div className={styles.frame} aria-hidden="true">
          <div className={styles.screen}>
            <div className={styles.status}>
              <span className={styles.rec}>REC 대기</span>
              <span className={styles.progress}>
                <span className={styles.number}>Q 01 / 05</span> 실전 모드 · 답변 2분
              </span>
            </div>
            <div className={styles.viewfinder}>
              <FaceDots eyes="dots" className={styles.face} />
            </div>
            <div className={styles.question}>
              <p className={styles.reading}>
                <Waveform bars={WAVE} className={styles.wave} />
                AI 면접관이 질문을 읽고 있어요
              </p>
              <p className={styles.text}>
                지원 직무에서 가장 자신 있는 역량을
                <br />
                실제 경험과 함께 말씀해 주세요.
              </p>
            </div>
          </div>
        </div>
        <h1 id="hero-title" className={styles.title}>
          읽는 연습은 끝. 이제 말로 답할 차례입니다.
        </h1>
        <div className={styles.buttons}>
          <ButtonLink href={PATHS.newInterview} size="lg">
            카메라 켜고 면접 시작 <Icon name="arrow" />
          </ButtonLink>
          <ButtonLink href="#flow" size="lg" variant="outline">
            면접 방식 둘러보기
          </ButtonLink>
        </div>
      </div>
      <div className={styles.bottom}>
        <p>녹화 영상은 면접 날짜가 지나면 자동 삭제돼요</p>
        <p>
          <span className={styles.mono}>PLEASE TURN ON YOUR CAMERA</span> 카메라와 마이크를 켜면 첫 질문이 시작됩니다
        </p>
        <p className={styles.scroll} aria-hidden="true">
          SCROLL
        </p>
      </div>
    </section>
  );
}

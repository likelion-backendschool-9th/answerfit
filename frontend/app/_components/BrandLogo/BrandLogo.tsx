import Image from "next/image";
import Link from "next/link";
import { PATHS } from "@/app/_lib/paths";
import styles from "./BrandLogo.module.css";

/** 주간·야간 로고를 둘 다 그리고 CSS가 모드에 맞는 쪽만 보여 준다. 서버는 모드를 몰라 바꿔 그리면 깜빡이기 때문이다 */
export function BrandLogo({ iconSize = 28 }: { iconSize?: number }) {
  return (
    <Link href={PATHS.home} className={styles.logo} aria-label="ANSWERFIT 홈">
      <Image src="/brand/logo-light.png" alt="" width={iconSize} height={iconSize} className={styles.lightIcon} />
      <Image src="/brand/logo-dark.png" alt="" width={iconSize} height={iconSize} className={styles.darkIcon} />
      <span className={styles.word} aria-hidden="true">
        ANSWER<span className={styles.fit}>FIT</span>
      </span>
    </Link>
  );
}

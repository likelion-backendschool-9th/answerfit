import Image from "next/image";
import Link from "next/link";
import { PATHS } from "@/app/_lib/paths";
import styles from "./BrandLogo.module.css";

export function BrandLogo({ iconSize = 28 }: { iconSize?: number }) {
  return (
    <Link href={PATHS.home} className={styles.logo} aria-label="ANSWERFIT 홈">
      <Image src="/brand/logo-light.png" alt="" width={iconSize} height={iconSize} />
      <span className={styles.word} aria-hidden="true">
        ANSWER<span className={styles.fit}>FIT</span>
      </span>
    </Link>
  );
}

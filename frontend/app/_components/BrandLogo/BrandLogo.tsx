import Image from "next/image";
import Link from "next/link";
import { PATHS } from "@/app/_lib/paths";
import { Wordmark } from "../Wordmark/Wordmark";
import styles from "./BrandLogo.module.css";

/** 로고 지침의 Lockup(헤더·푸터): 아이콘 + 워드마크 */
export function BrandLogo({ iconSize = 28 }: { iconSize?: number }) {
  return (
    <Link href={PATHS.home} className={styles.logo} aria-label="ANSWERFIT 홈">
      <Image src="/brand/logo-light.png" alt="" width={iconSize} height={iconSize} />
      <Wordmark />
    </Link>
  );
}

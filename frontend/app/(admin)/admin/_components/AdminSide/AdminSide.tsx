"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PATHS } from "@/app/_lib/paths";
import { Icon, type IconName } from "@/components/ui/Icon/Icon";
import { logoutAction } from "@/features/auth/actions";
import styles from "./AdminSide.module.css";

type Props = { nickname: string; email: string; count: number };

export function AdminSide({ nickname, email, count }: Props) {
  const pathname = usePathname();
  const item = (href: string, label: string, icon: IconName, badge = 0) => (
    <li>
      <Link href={href} className={styles.item} aria-current={pathname === href ? "page" : undefined}>
        <Icon name={icon} size={20} /> {label}
        {badge > 0 && (
          <span className={styles.badge}>
            {badge}
            <span className={styles.hidden}>개 처리 대기</span>
          </span>
        )}
      </Link>
    </li>
  );
  return (
    <div className={styles.side}>
      <Link href={PATHS.adminQuestions} className={styles.brand} aria-label="ANSWERFIT 관리자">
        <Image src="/brand/logo-light.png" alt="" width={28} height={28} className={styles.logo} />
        <span className={styles.word}>ANSWERFIT</span>
        <span className={styles.tag}>ADMIN</span>
      </Link>
      <nav aria-label="관리자 메뉴" className={styles.nav}>
        <p className={styles.group}>운영</p>
        <ul className={styles.menu}>
          {item(PATHS.adminQuestions, "질문 관리", "message", count)}
          {item(PATHS.adminMembers, "회원 관리", "users")}
        </ul>
      </nav>
      <div className={styles.bottom}>
        <div className={styles.profile}>
          <span className={styles.avatar} />
          <div className={styles.who}>
            <p className={styles.name}>{nickname}</p>
            <p className={styles.email}>{email}</p>
          </div>
        </div>
        <Link href={PATHS.home} className={styles.link}>
          <Icon name="arrow" size={18} /> 서비스 화면으로
        </Link>
        <form action={logoutAction}>
          <button type="submit" className={styles.link}>
            <Icon name="logout" size={18} /> 로그아웃
          </button>
        </form>
      </div>
    </div>
  );
}

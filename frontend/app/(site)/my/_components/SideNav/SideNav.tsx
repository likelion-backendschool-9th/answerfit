"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PATHS } from "@/app/_lib/paths";
import { Icon, type IconName } from "@/components/ui/Icon/Icon";
import { logoutAction } from "@/features/auth/actions";
import styles from "./SideNav.module.css";

const MENU: { href: string; label: string; icon: IconName }[] = [
  { href: PATHS.my, label: "대시보드", icon: "chart" },
  { href: PATHS.myInterviews, label: "면접 기록", icon: "video" },
  { href: PATHS.myDocuments, label: "서류 관리", icon: "folder" },
  { href: PATHS.myQuestions, label: "내가 올린 질문", icon: "pencil" },
  { href: PATHS.myLikes, label: "좋아요한 질문", icon: "heart" },
];

export function SideNav({ nickname, email }: { nickname: string; email: string }) {
  const pathname = usePathname();
  const item = (href: string, label: string, icon: IconName) => (
    <li key={href}>
      <Link href={href} className={styles.item} aria-current={pathname === href ? "page" : undefined}>
        <Icon name={icon} size={20} /> {label}
      </Link>
    </li>
  );
  return (
    <nav aria-label="마이페이지 메뉴">
      <div className={styles.profile}>
        <Image src="/brand/logo-light.png" alt="" width={48} height={48} className={styles.avatar} />
        <div className={styles.who}>
          <p className={styles.name}>{nickname}</p>
          <p className={styles.email}>{email}</p>
        </div>
      </div>
      <ul className={styles.menu}>{MENU.map(({ href, label, icon }) => item(href, label, icon))}</ul>
      <ul className={styles.menu}>
        {item(PATHS.mySettings, "계정 설정", "gear")}
        <li>
          <form action={logoutAction}>
            <button type="submit" className={`${styles.item} ${styles.logout}`}>
              <Icon name="logout" size={20} /> 로그아웃
            </button>
          </form>
        </li>
      </ul>
    </nav>
  );
}

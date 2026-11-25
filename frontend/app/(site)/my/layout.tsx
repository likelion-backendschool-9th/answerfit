import { Suspense, type ReactNode } from "react";
import { TopBar } from "@/app/_components/TopBar/TopBar";
import { PATHS } from "@/app/_lib/paths";
import { getSession } from "@/features/session/session";
import { SideNav } from "./_components/SideNav/SideNav";
import styles from "./layout.module.css";

export default function MyLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TopBar current={PATHS.my} />
      <div className={styles.layout}>
        <div className={styles.side}>
          <Suspense>
            <Side />
          </Suspense>
        </div>
        <div className={styles.content}>
          <Suspense>{children}</Suspense>
        </div>
      </div>
    </>
  );
}

async function Side() {
  const session = await getSession();
  return session && <SideNav nickname={session.nickname} email={session.email} />;
}

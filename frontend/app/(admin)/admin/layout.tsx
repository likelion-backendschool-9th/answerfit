import { Suspense, type ReactNode } from "react";
import { AppFooter } from "@/app/_components/AppFooter/AppFooter";
import { Main } from "@/app/_components/Main/Main";
import { getTodoCount } from "@/features/admin/api";
import { getSession } from "@/features/session/session";
import { AdminSide } from "./_components/AdminSide/AdminSide";
import styles from "./layout.module.css";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <Frame>{children}</Frame>
    </Suspense>
  );
}

/** 관리자가 아니면 메뉴를 그리지 않는다. 막는 일은 화면과 데이터 함수가 한다. 관리자 화면에는 서비스 푸터 대신 전환기만 둔다 */
async function Frame({ children }: { children: ReactNode }) {
  // 세션을 못 불러온 오류도 화면이 알린다. 푸터에서 모드를 되돌릴 수 있어야 한다
  const session = await getSession().catch(() => null);
  if (session?.role !== "admin") {
    return (
      <>
        <Main>{children}</Main>
        <Suspense>
          <AppFooter switcherOnly />
        </Suspense>
      </>
    );
  }
  return (
    <div className={styles.frame}>
      <Suspense fallback={<AdminSide nickname={session.nickname} email={session.email} count={0} />}>
        <Side nickname={session.nickname} email={session.email} />
      </Suspense>
      <div className={styles.content}>
        <Main>
          <Suspense>{children}</Suspense>
        </Main>
        <Suspense>
          <AppFooter switcherOnly />
        </Suspense>
      </div>
    </div>
  );
}

async function Side(who: { nickname: string; email: string }) {
  // 개수를 못 불러와도 메뉴는 보여 준다. 오류는 화면이 알린다
  const count = await getTodoCount().catch(() => 0);
  return <AdminSide {...who} count={count} />;
}

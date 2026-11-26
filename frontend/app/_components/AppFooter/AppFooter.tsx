import { DemoSwitcher } from "@/demo/DemoSwitcher";
import { getDataMode, isSwitchable } from "@/demo/mode";
import { readDemoSession } from "@/demo/session";
import { SiteFooter } from "../SiteFooter/SiteFooter";

/**
 * 푸터는 늘 그리고, 데이터·역할 전환기(개발 중 임시)는 전환할 수 있는 환경에서만 넣는다.
 * switcherOnly면 전환기만 그리므로 전환할 수 없는 환경에서는 아무것도 그리지 않는다. 쿠키를 읽으므로 Suspense 안에 둔다
 */
export async function AppFooter({ switcherOnly = false }: { switcherOnly?: boolean }) {
  const mode = await getDataMode();
  if (!isSwitchable()) return switcherOnly ? null : <SiteFooter />;
  const session = await readDemoSession();
  return (
    <SiteFooter switcherOnly={switcherOnly}>
      <DemoSwitcher mode={mode} role={session?.role ?? "guest"} />
    </SiteFooter>
  );
}

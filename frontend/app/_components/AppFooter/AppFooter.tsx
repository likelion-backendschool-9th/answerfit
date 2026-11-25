import { DemoSwitcher } from "@/demo/DemoSwitcher";
import { getDataMode, isSwitchable } from "@/demo/mode";
import { readDemoSession } from "@/demo/session";
import { SiteFooter } from "../SiteFooter/SiteFooter";

/** 전환할 수 있는 환경에서만 푸터를 그린다. 쿠키를 읽으므로 Suspense 안에 둔다 */
export async function AppFooter() {
  const mode = await getDataMode();
  if (!isSwitchable()) return null;
  const session = await readDemoSession();
  return (
    <SiteFooter>
      <DemoSwitcher mode={mode} role={session?.role ?? "guest"} />
    </SiteFooter>
  );
}

import { Suspense, type ReactNode } from "react";
import { AppFooter } from "../AppFooter/AppFooter";
import { Main } from "../Main/Main";
import { SiteFooter } from "../SiteFooter/SiteFooter";

export function SiteFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <Main>{children}</Main>
      <Suspense fallback={<SiteFooter />}>
        <AppFooter />
      </Suspense>
    </>
  );
}

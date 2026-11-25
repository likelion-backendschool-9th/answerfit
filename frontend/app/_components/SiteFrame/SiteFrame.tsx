import { Suspense, type ReactNode } from "react";
import { AppFooter } from "../AppFooter/AppFooter";
import { Main } from "../Main/Main";

export function SiteFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <Main>{children}</Main>
      <Suspense>
        <AppFooter />
      </Suspense>
    </>
  );
}

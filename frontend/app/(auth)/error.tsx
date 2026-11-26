"use client";

import { ErrorContent } from "@/app/_components/ErrorContent/ErrorContent";
import { Main } from "@/app/_components/Main/Main";

export default function ErrorPage(props: { error: unknown; retry: () => void }) {
  return (
    <Main>
      <ErrorContent {...props} />
    </Main>
  );
}

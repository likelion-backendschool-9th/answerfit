"use client";

import { ErrorContent } from "../_components/ErrorContent/ErrorContent";
import { Main } from "../_components/Main/Main";

export default function ErrorPage(props: { error: unknown; retry: () => void }) {
  return (
    <Main>
      <ErrorContent {...props} />
    </Main>
  );
}

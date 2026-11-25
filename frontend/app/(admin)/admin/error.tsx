"use client";

import { ErrorContent } from "@/app/_components/ErrorContent/ErrorContent";

export default function ErrorPage(props: { error: unknown; retry: () => void }) {
  return <ErrorContent {...props} />;
}

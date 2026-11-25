"use client";

import { useEffect } from "react";
import { PATHS } from "@/app/_lib/paths";
import { Button, ButtonLink } from "@/components/ui/Button/Button";
import styles from "./ErrorContent.module.css";

export function ErrorContent({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest = typeof error === "object" && error !== null && "digest" in error ? error.digest : undefined;
  const notConnected = digest === "API_NOT_CONNECTED";
  return (
    <div className={styles.content} role="alert">
      <h1 className={styles.title}>{notConnected ? "아직 연동되지 않은 API예요" : "화면을 불러오지 못했어요"}</h1>
      <p className={styles.description}>{notConnected ? "화면에 필요한 백엔드 API를 부르지 못했어요." : "잠시 뒤 다시 시도해 주세요."}</p>
      <Button onClick={() => retry()}>다시 시도</Button>
      <ButtonLink href={PATHS.home} variant="outline">
        홈으로 가기
      </ButtonLink>
    </div>
  );
}

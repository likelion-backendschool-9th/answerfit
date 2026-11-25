"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button/Button";
import { setLinkAction } from "@/features/member/actions";
import type { LinkedLogin } from "@/features/member/types";
import { SettingsCard } from "../SettingsCard/SettingsCard";
import styles from "./LinkedLogins.module.css";

export function LinkedLogins({ links }: { links: LinkedLogin[] }) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const change = (provider: string, linked: boolean) =>
    startTransition(async () => {
      const result = await setLinkAction(provider, linked).catch(() => ({ ok: false, message: "바꾸지 못했어요. 다시 시도해 주세요." }));
      setError(result.ok ? undefined : result.message);
    });

  return (
    <SettingsCard title="연결된 로그인">
      <ul className={styles.list}>
        {links.map(({ provider, label, account }) => (
          <li key={provider} className={styles.row}>
            <div>
              <p className={styles.name}>{label}</p>
              <p className={account ? styles.on : styles.off}>{account ? `${account} 계정과 연결됨` : "연결되지 않음"}</p>
            </div>
            {account ? (
              <button type="button" className={styles.unlink} aria-label={`${label} 연결 해제`} disabled={pending} onClick={() => change(provider, false)}>
                연결 해제
              </button>
            ) : (
              <Button variant="outline" className={styles.link} aria-label={`${label} 연결하기`} disabled={pending} onClick={() => change(provider, true)}>
                연결하기
              </Button>
            )}
          </li>
        ))}
      </ul>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </SettingsCard>
  );
}

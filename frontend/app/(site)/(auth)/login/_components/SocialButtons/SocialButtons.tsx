"use client";

import { useActionState } from "react";
import { cn } from "@/lib/cn";
import { socialLoginAction } from "@/features/auth/actions";
import styles from "./SocialButtons.module.css";

const GoogleIcon = (
  <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
    <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
  </svg>
);
const GithubIcon = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
    <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.1c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.9 1.2 1.9 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.4-1.3-5.4-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 5 18.3 5.3 18.3 5.3c.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z" />
  </svg>
);
const KakaoIcon = (
  <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor" aria-hidden="true">
    <path d="M10 2.6c-5 0-9 3.1-9 6.9 0 2.5 1.7 4.6 4.2 5.8l-.8 3c-.1.3.2.5.5.3l3.5-2.3 1.6.1c5 0 9-3.1 9-6.9s-4-6.9-9-6.9Z" />
  </svg>
);

const PROVIDERS = [
  { id: "google", label: "구글로 계속하기", icon: GoogleIcon },
  { id: "github", label: "GitHub로 계속하기", icon: GithubIcon },
  { id: "kakao", label: "카카오로 계속하기", icon: KakaoIcon },
];

/** notice: 카카오 로그인이 실패해 돌아왔을 때의 안내 */
export function SocialButtons({ next, notice }: { next: string; notice?: string }) {
  const [state, action, pending] = useActionState(socialLoginAction, { error: notice });
  return (
    <form action={action} className={styles.list}>
      <input type="hidden" name="next" value={next} />
      {PROVIDERS.map(({ id, label, icon }) => (
        <button key={id} type="submit" name="provider" value={id} disabled={pending} className={cn(styles.button, id === "kakao" && styles.kakao)}>
          <span className={styles.icon}>{icon}</span>
          {label}
        </button>
      ))}
      {state.error && (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}

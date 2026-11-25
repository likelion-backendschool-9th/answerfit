"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Icon } from "@/components/ui/Icon/Icon";
import { releaseAction } from "@/features/admin/actions";
import { PROVIDER_LABEL, seenLabel, suspendedLabel } from "@/features/admin/rules";
import type { AdminMember } from "@/features/admin/types";
import { StateBadge } from "../../../_components/StateBadge/StateBadge";
import { SuspendModal } from "../SuspendModal/SuspendModal";
import styles from "./MemberTable.module.css";

/** 올린 질문이 이만큼이면 눈에 띄게 한다 */
const MANY_QUESTIONS = 5;

export function MemberTable({ items, today }: { items: AdminMember[]; today: string }) {
  const [target, setTarget] = useState<AdminMember | null>(null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function release(id: string) {
    startTransition(async () => {
      const result = await releaseAction(id).catch(() => ({ error: "정지를 풀지 못했어요. 다시 시도해 주세요." }));
      setError(result.error);
    });
  }

  return (
    <>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>회원</th>
              <th className={styles.provider}>가입 방식</th>
              <th className={styles.joined}>가입일</th>
              <th className={styles.seen}>최근 접속</th>
              <th className={styles.interviews}>면접</th>
              <th className={styles.questions}>올린 질문</th>
              <th className={styles.status}>상태</th>
              <th className={styles.tools}>
                <span className={styles.hidden}>관리</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((member) => {
              const { id, nickname, email, provider, joinedOn, lastSeenOn, interviews, questions, suspension } = member;
              const seen = seenLabel(lastSeenOn, today);
              return (
                <tr key={id} className={suspension ? styles.suspended : undefined}>
                  <td>
                    <div className={styles.member}>
                      <Image src="/brand/logo-light.png" alt="" width={32} height={32} className={styles.avatar} />
                      <div className={styles.who}>
                        <p>{nickname}</p>
                        <p className={styles.muted}>{email}</p>
                      </div>
                    </div>
                  </td>
                  <td className={provider === "local" ? styles.muted : undefined}>{PROVIDER_LABEL[provider]}</td>
                  <td className={styles.muted}>{joinedOn.replaceAll("-", ".")}</td>
                  <td className={seen === "오늘" ? styles.today : styles.muted}>{seen}</td>
                  <td className={styles.number}>{interviews}</td>
                  <td className={questions >= MANY_QUESTIONS ? styles.many : styles.number}>{questions}</td>
                  <td>{suspension ? <StateBadge tone="danger">{suspendedLabel(suspension.releaseOn)}</StateBadge> : <StateBadge tone="success">정상</StateBadge>}</td>
                  <td className={styles.action}>
                    {suspension ? (
                      <button type="button" className={styles.release} aria-label={`${nickname} 정지 해제`} disabled={pending} onClick={() => release(id)}>
                        정지 해제
                      </button>
                    ) : (
                      <button type="button" className={styles.suspend} aria-label={`${nickname} 이용 정지`} onClick={() => setTarget(member)}>
                        <Icon name="ban" size={16} /> 이용 정지
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <SuspendModal member={target} today={today} onClose={() => setTarget(null)} />
    </>
  );
}

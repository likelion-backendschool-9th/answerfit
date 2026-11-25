"use client";

import { useId, useState, useTransition } from "react";
import Link from "next/link";
import { PATHS } from "@/app/_lib/paths";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { Modal } from "@/components/ui/Modal/Modal";
import { TextField } from "@/components/ui/TextField/TextField";
import { removeGroupAction, renameGroupAction } from "@/features/interview/actions";
import type { InterviewRecord } from "@/features/interview/records";
import { startedLabel } from "@/features/interview/result";
import { MODE_LABEL } from "@/features/interview/setup";
import type { DocumentFile, DocumentGroup } from "@/features/interview/types";
import { cn } from "@/lib/cn";
import styles from "./GroupCard.module.css";

const KIND_LABEL: Record<DocumentFile["kind"], string> = { pdf: "PDF", link: "링크", text: "텍스트" };

/** 2026.11.20 (금) 14:02 → 11.20 14:02 */
const uploaded = (iso: string) => startedLabel(iso).replace(/^\d{4}\.(\S+) \(.\) (\S+)$/, "$1 $2");

type Props = { group: DocumentGroup; records: InterviewRecord[]; open: boolean; onToggle: () => void };

export function GroupCard({ group, records, open, onToggle }: Props) {
  const bodyId = useId();
  const [modal, setModal] = useState<"rename" | "remove" | null>(null);
  const [notice, setNotice] = useState("");
  const close = () => setModal(null);

  return (
    <article className={styles.card}>
      <div className={cn(styles.head, open && styles.opened)}>
        <span className={styles.icon}>
          <Icon name="folder" size={20} />
        </span>
        <div className={styles.text}>
          <h2 className={styles.name}>{group.name}</h2>
          <p className={styles.meta}>
            {group.createdOn.replaceAll("-", ".")} 등록 · 서류 {group.files.length}개 · 면접 {records.length}회
          </p>
        </div>
        <button type="button" className={styles.tool} aria-label={`${group.name} 이름 바꾸기`} onClick={() => setModal("rename")}>
          <Icon name="pencil" size={16} />
        </button>
        <button type="button" className={cn(styles.tool, styles.muted)} aria-label={`${group.name} 삭제`} onClick={() => setModal("remove")}>
          <Icon name="trash" size={16} />
        </button>
        <button type="button" className={styles.toggle} aria-expanded={open} aria-controls={bodyId} aria-label={`${group.name} ${open ? "접기" : "펼치기"}`} onClick={onToggle}>
          <Icon name={open ? "up" : "down"} size={20} />
        </button>
      </div>
      {open && (
        <div className={styles.body} id={bodyId}>
          {group.error && <p className={styles.error}>{group.error}</p>}
          <h3 className={styles.label}>서류</h3>
          <ul className={styles.files}>
            {group.files.map(({ id, name, kind, uploadedAt }) => (
              <li key={id} className={styles.file}>
                <span className={styles.fileIcon}>
                  <Icon name={kind === "link" ? "link" : "file"} size={20} />
                </span>
                <div className={styles.text}>
                  <p className={styles.fileName}>{name}</p>
                  <p className={styles.meta}>
                    <span className={cn(styles.kind, kind === "pdf" && styles.pdf)}>{KIND_LABEL[kind]}</span> {uploaded(uploadedAt)} 업로드
                  </p>
                </div>
                <button type="button" className={styles.download} aria-label={`${name} 내려받기`} onClick={() => setNotice("서류 내려받기는 파일 저장을 연동한 뒤에 쓸 수 있어요.")}>
                  <Icon name="download" size={20} />
                </button>
              </li>
            ))}
          </ul>
          <p className={styles.notice} role="status">
            {notice}
          </p>
          <h3 className={styles.label}>이 서류로 본 면접</h3>
          {records.length === 0 ? (
            <p className={styles.none}>아직 이 서류로 본 면접이 없어요.</p>
          ) : (
            <ul className={styles.records}>
              {records.map(({ id, title, mode, count, score }) => (
                <li key={id}>
                  <Link href={PATHS.interviewResult(id)} className={styles.record}>
                    <Icon name="video" size={18} />
                    <span className={styles.recordTitle}>{title}</span>
                    <span className={styles.mode}>{MODE_LABEL[mode]}</span>
                    <span>{count}문항</span>
                    <span>
                      <span className={styles.score}>{score}</span> 점
                    </span>
                    <Icon name="chevron" size={16} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <Modal open={modal === "rename"} title="서류 그룹 이름 바꾸기" onClose={close}>
        <RenameForm id={group.id} name={group.name} onClose={close} />
      </Modal>
      <Modal open={modal === "remove"} title="서류 그룹을 삭제할까요?" description="서류가 모두 삭제되고 되돌릴 수 없어요. 이 서류로 본 면접 기록은 남아요." onClose={close}>
        <RemoveForm id={group.id} onClose={close} />
      </Modal>
    </article>
  );
}

function RenameForm({ id, name, onClose }: { id: string; name: string; onClose: () => void }) {
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await renameGroupAction(id, draft).catch(() => ({ error: "이름을 바꾸지 못했어요." }));
          if (result.error) setError(result.error);
          else onClose();
        });
      }}
    >
      <TextField label="이름" value={draft} error={error} onChange={(event) => setDraft(event.target.value)} />
      <div className={styles.buttons}>
        <Button variant="outline" onClick={onClose} disabled={pending}>
          취소
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중" : "저장하기"}
        </Button>
      </div>
    </form>
  );
}

function RemoveForm({ id, onClose }: { id: string; onClose: () => void }) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  return (
    <div className={styles.form}>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.buttons}>
        <Button variant="outline" onClick={onClose} disabled={pending}>
          취소
        </Button>
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await removeGroupAction(id).catch(() => ({ error: "삭제하지 못했어요." }));
              if (result.error) setError(result.error);
              else onClose();
            })
          }
        >
          {pending ? "삭제 중" : "삭제하기"}
        </Button>
      </div>
    </div>
  );
}

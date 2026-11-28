"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Chip } from "@/components/ui/Chip/Chip";
import { Icon } from "@/components/ui/Icon/Icon";
import { ACTIVITY_LABEL, formatPeriod, LONG_MAX, periodError, SHORT_MAX, TITLE_MAX, titleError } from "@/features/experience/rules";
import { ACTIVITY_TYPES, type Column, type Experience } from "@/features/experience/types";
import { cn } from "@/lib/cn";
import { PeriodPicker } from "../PeriodPicker/PeriodPicker";
import { Popover, type CloseReason } from "../Popover/Popover";
import { TagPicker } from "../TagPicker/TagPicker";
import styles from "./ExperienceTable.module.css";

export type CellStatus = "saving" | "saved" | { error: string };
export type RowHeight = "one" | "two" | "all";
export const cellKey = (id: string, column: Column) => `${id}:${column}`;

const COLUMNS: { key: Column; label: string }[] = [
  { key: "title", label: "제목" },
  { key: "type", label: "구분" },
  { key: "period", label: "기간" },
  { key: "organization", label: "소속" },
  { key: "role", label: "역할" },
  { key: "tags", label: "태그" },
  { key: "result", label: "성과" },
];
/** 표 안에서 바로 적는 칸과 그 글자 수. 나머지 칸은 누르면 팝오버가 열린다 */
const TEXT_MAX: Partial<Record<Column, number>> = { title: TITLE_MAX, organization: SHORT_MAX, role: SHORT_MAX };
const LAST = COLUMNS.length - 1;
const SKELETON_ROWS = 6;

type Editing = { id: string; column: Column; draft: string; anchor: HTMLElement | null };

type Props = {
  /** null이면 불러오는 중이다 */
  items: Experience[] | null;
  rowHeight: RowHeight;
  status: Record<string, CellStatus>;
  custom: string[];
  /** 이 행이 나타나면 제목 칸을 바로 편집한다 */
  newRowId: string | null;
  empty: ReactNode;
  onChange: (id: string, column: Column, patch: Partial<Experience>) => void;
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
};

/** 엑셀처럼 셀을 골라 고치는 표. 방향키로 움직이고 Enter로 편집한다 */
export function ExperienceTable({ items, rowHeight, status, custom, newRowId, empty, onChange, onOpen, onDuplicate, onRemove, onAdd }: Props) {
  const table = useRef<HTMLTableElement>(null);
  const [active, setActive] = useState<{ id: string; col: number } | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [menu, setMenu] = useState<{ id: string; anchor: HTMLElement } | null>(null);
  const refocus = useRef(false);
  const [seenNew, setSeenNew] = useState<string | null>(null);
  const rows = items ?? [];

  if (newRowId && newRowId !== seenNew && rows.some(({ id }) => id === newRowId)) {
    setSeenNew(newRowId);
    setActive({ id: newRowId, col: 0 });
    setEditing({ id: newRowId, column: "title", draft: "", anchor: null });
  }

  // 편집을 마치거나 키보드로 움직이면 고른 셀로 포커스를 돌려준다
  useEffect(() => {
    if (!refocus.current || editing || !active) return;
    refocus.current = false;
    table.current?.querySelector<HTMLElement>(`[data-cell="${CSS.escape(`${active.id}:${active.col}`)}"]`)?.focus();
  });

  function select(id: string, col: number) {
    setActive({ id, col });
    refocus.current = true;
  }

  function edit(item: Experience, col: number, anchor: HTMLElement, typed?: string) {
    const column = COLUMNS[col].key;
    setActive({ id: item.id, col });
    setEditing({ id: item.id, column, draft: typed ?? (TEXT_MAX[column] ? String(item[column as "title"]) : ""), anchor });
  }

  function finish() {
    setEditing(null);
    refocus.current = true;
  }

  /** 바뀐 값만 저장한다 */
  function commit(patch: Partial<Experience>) {
    const item = rows.find(({ id }) => id === editing?.id);
    if (editing && item && Object.entries(patch).some(([key, value]) => JSON.stringify(item[key as keyof Experience]) !== JSON.stringify(value))) onChange(editing.id, editing.column, patch);
    finish();
  }

  /** Tab 순서로 step칸 옮긴 셀. 표 밖이면 null */
  function step(row: number, col: number, by: number) {
    const next = row * COLUMNS.length + col + by;
    if (next < 0 || next >= rows.length * COLUMNS.length) return null;
    return { id: rows[Math.floor(next / COLUMNS.length)].id, col: next % COLUMNS.length };
  }

  function onCellKey(event: KeyboardEvent<HTMLTableCellElement>, row: number, col: number) {
    if (event.target !== event.currentTarget) return;
    const target = (() => {
      switch (event.key) {
        case "ArrowUp":
          return row > 0 ? { id: rows[row - 1].id, col } : null;
        case "ArrowDown":
          return row < rows.length - 1 ? { id: rows[row + 1].id, col } : null;
        case "ArrowLeft":
          return col > 0 ? { id: rows[row].id, col: col - 1 } : null;
        case "ArrowRight":
          return col < LAST ? { id: rows[row].id, col: col + 1 } : null;
        case "Tab":
          return step(row, col, event.shiftKey ? -1 : 1);
      }
      return undefined;
    })();
    if (target !== undefined) {
      // 표 끝에서 누른 Tab은 브라우저에 맡겨 표 밖으로 나간다
      if (target === null) return event.key === "Tab" ? undefined : event.preventDefault();
      event.preventDefault();
      return select(target.id, target.col);
    }
    if (event.key === "Enter" || event.key === "F2") {
      event.preventDefault();
      return edit(rows[row], col, event.currentTarget);
    }
    // 고른 칸에서 바로 글자를 치면 그 글자로 편집을 시작한다
    if (TEXT_MAX[COLUMNS[col].key] && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      edit(rows[row], col, event.currentTarget, event.key);
    }
  }

  const editingItem = editing && rows.find(({ id }) => id === editing.id);
  const firstCell = rows[0] && `${rows[0].id}:0`;

  return (
    <div className={styles.scroll}>
      <table ref={table} className={styles.table} role="grid" aria-label="경험 목록" aria-busy={items === null} data-height={rowHeight}>
        <thead>
          <tr>
            <th scope="col" className={styles.number}>
              <span className={styles.hidden}>번호</span>
            </th>
            {COLUMNS.map(({ key, label }) => (
              <th key={key} scope="col" className={cn(styles[key], key === "title" && styles.sticky)}>
                {label}
                {key === "title" && <span className={styles.required}>*</span>}
              </th>
            ))}
            <th scope="col" className={styles.actions}>
              <span className={styles.hidden}>행 메뉴</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items === null &&
            Array.from({ length: SKELETON_ROWS }, (_, row) => (
              <tr key={row}>
                {Array.from({ length: COLUMNS.length + 2 }, (_, col) => (
                  <td key={col} className={cn(col === 0 && styles.number, col === 1 && styles.sticky)}>
                    <span className={styles.bone} />
                  </td>
                ))}
              </tr>
            ))}
          {items?.length === 0 && (
            <tr>
              <td colSpan={COLUMNS.length + 2} className={styles.empty}>
                {empty}
              </td>
            </tr>
          )}
          {rows.map((item, row) => (
            <tr key={item.id}>
              <td className={styles.number}>
                {!item.content.trim() && (
                  <span className={styles.dot} tabIndex={0}>
                    <span className={styles.tip}>활동 내용을 아직 안 적었어요</span>
                  </span>
                )}
                {row + 1}
              </td>
              {COLUMNS.map(({ key }, col) => {
                const cell = `${item.id}:${col}`;
                const isActive = active ? active.id === item.id && active.col === col : cell === firstCell;
                const isEditing = editing?.id === item.id && editing.column === key;
                const saved = status[cellKey(item.id, key)];
                const error = (typeof saved === "object" && saved.error) || (key === "title" && titleError(item.title)) || null;
                const inline = isEditing && TEXT_MAX[key] !== undefined;
                return (
                  <td
                    key={key}
                    data-cell={cell}
                    tabIndex={isActive && !inline ? 0 : -1}
                    aria-selected={isActive}
                    aria-invalid={error ? true : undefined}
                    className={cn(styles.cell, styles[key], key === "title" && styles.sticky, isActive && styles.active, isEditing && styles.editing, error && styles.error)}
                    onClick={(event) => {
                      if (isEditing) return;
                      if (!TEXT_MAX[key] || isActive) edit(item, col, event.currentTarget);
                      else select(item.id, col);
                    }}
                    onDoubleClick={(event) => TEXT_MAX[key] && !isEditing && edit(item, col, event.currentTarget)}
                    onKeyDown={(event) => onCellKey(event, row, col)}
                  >
                    <div className={styles.inner}>
                      {inline ? (
                        <InlineInput
                          label={COLUMNS[col].label}
                          initial={editing.draft}
                          max={TEXT_MAX[key]!}
                          onCommit={(value, move) => {
                            commit({ [key]: value.trim() });
                            const next = move && step(row, col, move);
                            if (next) select(next.id, next.col);
                          }}
                          onCancel={finish}
                        />
                      ) : (
                        <Value item={item} column={key} />
                      )}
                      <Status value={saved} />
                    </div>
                    {error && !isEditing && <span className={styles.tip}>{error}</span>}
                  </td>
                );
              })}
              <td className={styles.actions}>
                <button type="button" className={styles.icon} aria-label={`${item.title || "새 경험"} 상세 열기`} onClick={() => onOpen(item.id)}>
                  <Icon name="chevron" size={16} />
                </button>
                <button type="button" className={styles.icon} aria-label={`${item.title || "새 경험"} 메뉴`} aria-haspopup="dialog" onClick={(event) => setMenu({ id: item.id, anchor: event.currentTarget })}>
                  ⋯
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr>
              <td colSpan={COLUMNS.length + 2}>
                <button type="button" className={styles.add} onClick={onAdd}>
                  <Icon name="plus" size={16} /> 새 행 추가
                </button>
              </td>
            </tr>
          </tfoot>
        )}
      </table>
      {editing?.anchor && editingItem && !TEXT_MAX[editing.column] && <CellEditor key={editing.id + editing.column} item={editingItem} column={editing.column} anchor={editing.anchor} custom={custom} onChange={(patch) => onChange(editingItem.id, editing.column, patch)} onCommit={commit} onCancel={finish} />}
      {menu && (
        <Popover anchor={menu.anchor} label="행 메뉴" onClose={() => setMenu(null)}>
          <div className={styles.menu}>
            <button
              type="button"
              onClick={() => {
                setMenu(null);
                onDuplicate(menu.id);
              }}
            >
              복제
            </button>
            <button
              type="button"
              className={styles.danger}
              onClick={() => {
                setMenu(null);
                onRemove(menu.id);
              }}
            >
              <Icon name="trash" size={16} /> 삭제
            </button>
          </div>
        </Popover>
      )}
    </div>
  );
}

function Value({ item, column }: { item: Experience; column: Column }) {
  switch (column) {
    case "type":
      return item.type && <Chip>{ACTIVITY_LABEL[item.type]}</Chip>;
    case "period":
      return <span className={cn(styles.text, !item.startedOn && styles.muted)}>{formatPeriod(item) ?? "기간 선택"}</span>;
    case "tags":
      if (item.tags.length === 0) return <span className={styles.muted}>+ 태그 선택</span>;
      return (
        <span className={styles.tagList}>
          {item.tags.slice(0, 3).map((tag) => (
            <Chip key={tag}>{tag}</Chip>
          ))}
          {item.tags.length > 3 && <span className={styles.more}>+{item.tags.length - 3}</span>}
        </span>
      );
    case "result":
      return <span className={styles.clamp}>{item.result}</span>;
    default:
      return <span className={styles.text}>{item[column]}</span>;
  }
}

function Status({ value }: { value: CellStatus | undefined }) {
  if (value === "saving")
    return (
      <span className={styles.saving} role="img" aria-label="저장 중">
        <Icon name="spinner" size={14} />
      </span>
    );
  if (value === "saved")
    return (
      <span className={styles.saved} role="img" aria-label="저장됨">
        <Icon name="tick" size={14} />
      </span>
    );
  return null;
}

/** move는 Tab(1)·Shift+Tab(-1)으로 끝내 옆 칸으로 갈 때다 */
function InlineInput({ label, initial, max, onCommit, onCancel }: { label: string; initial: string; max: number; onCommit: (value: string, move?: number) => void; onCancel: () => void }) {
  const [value, setValue] = useState(initial);
  const done = useRef(false);
  const end = (run: () => void) => {
    if (done.current) return;
    done.current = true;
    run();
  };
  return (
    <input
      className={styles.input}
      aria-label={label}
      value={value}
      maxLength={max}
      autoFocus
      onFocus={(event) => event.currentTarget.setSelectionRange(value.length, value.length)}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => end(() => onCommit(value))}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === "Enter" || event.key === "Tab") {
          event.preventDefault();
          end(() => onCommit(value, event.key === "Tab" ? (event.shiftKey ? -1 : 1) : undefined));
        } else if (event.key === "Escape") {
          event.preventDefault();
          end(onCancel);
        }
      }}
    />
  );
}

type EditorProps = {
  item: Experience;
  column: Column;
  anchor: HTMLElement;
  custom: string[];
  /** 팝오버를 닫지 않고 바로 저장한다(태그) */
  onChange: (patch: Partial<Experience>) => void;
  onCommit: (patch: Partial<Experience>) => void;
  onCancel: () => void;
};

/** 바깥을 누르면 적은 내용을 저장하고, Esc는 취소한다 */
function CellEditor({ item, column, anchor, custom, onChange, onCommit, onCancel }: EditorProps) {
  const [period, setPeriod] = useState({ startedOn: item.startedOn, endedOn: item.endedOn });
  const [result, setResult] = useState(item.result);
  const periodProblem = periodError(period.startedOn, period.endedOn);

  if (column === "type") {
    const options = [null, ...ACTIVITY_TYPES];
    return (
      <Popover anchor={anchor} label="구분 고르기" onClose={onCancel}>
        <div
          className={styles.menu}
          onKeyDown={(event) => {
            if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
            event.preventDefault();
            const buttons = [...event.currentTarget.querySelectorAll("button")];
            const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
            buttons[(at + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length]?.focus();
          }}
        >
          {options.map((type) => (
            <button key={type ?? "none"} type="button" aria-pressed={item.type === type} autoFocus={item.type === type} onClick={() => onCommit({ type })}>
              {type ? ACTIVITY_LABEL[type] : <span className={styles.muted}>선택 안 함</span>}
              {item.type === type && <Icon name="tick" size={16} />}
            </button>
          ))}
        </div>
      </Popover>
    );
  }

  if (column === "period") {
    const close = (reason: CloseReason) => (reason === "outside" && !periodProblem ? onCommit(period) : onCancel());
    return (
      <Popover anchor={anchor} label="기간 고르기" onClose={close}>
        <div className={styles.editor}>
          <PeriodPicker value={period} onChange={setPeriod} />
          <div className={styles.editorFoot}>
            <button type="button" className={styles.link} onClick={() => onCommit({ startedOn: null, endedOn: null })}>
              기간 지우기
            </button>
            <Button className={styles.apply} disabled={Boolean(periodProblem)} onClick={() => onCommit(period)}>
              적용
            </Button>
          </div>
        </div>
      </Popover>
    );
  }

  if (column === "tags") {
    return (
      <Popover anchor={anchor} label="태그 고르기" onClose={onCancel}>
        <div className={styles.editor}>
          <TagPicker value={item.tags} custom={custom} onChange={(tags) => onChange({ tags })} />
        </div>
      </Popover>
    );
  }

  return (
    <Popover anchor={anchor} label="성과 적기" onClose={(reason) => (reason === "outside" ? onCommit({ result: result.trim() }) : onCancel())}>
      <div className={styles.editor}>
        <textarea
          className={styles.textarea}
          aria-label="성과"
          rows={6}
          maxLength={LONG_MAX}
          value={result}
          onChange={(event) => setResult(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) onCommit({ result: result.trim() });
          }}
        />
        <div className={styles.editorFoot}>
          <span className={styles.muted}>Ctrl+Enter 완료 · Esc 취소</span>
          <Button className={styles.apply} onClick={() => onCommit({ result: result.trim() })}>
            완료
          </Button>
        </div>
      </div>
    </Popover>
  );
}

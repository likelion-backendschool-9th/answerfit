"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Chip } from "@/components/ui/Chip/Chip";
import { Icon } from "@/components/ui/Icon/Icon";
import { ACTIVITY_LABEL, formatPeriod, LONG_MAX, periodError, SHORT_MAX, TITLE_MAX, titleError } from "@/features/experience/rules";
import { ACTIVITY_TYPES, type Column, type Experience, type Patch, type Story } from "@/features/experience/types";
import { cn } from "@/lib/cn";
import { resizeByKey, startResize } from "../../_lib/drag";
import { PeriodPicker } from "../PeriodPicker/PeriodPicker";
import { Popover, type CloseReason } from "../Popover/Popover";
import { TagPicker } from "../TagPicker/TagPicker";
import styles from "./ExperienceTable.module.css";

export type CellStatus = "saving" | "saved" | { error: string };
export type RowHeight = "one" | "two" | "all";
/** 경험 열은 storyId가 null이다 */
export const cellKey = (expId: string, storyId: string | null, column: Column) => `${expId}:${storyId ?? "-"}:${column}`;
/** 이 셀을 고른다(edit이면 바로 편집한다). key가 바뀔 때마다 한 번 따른다 */
export type FocusRequest = { key: string; expId: string; storyId: string; column: Column; edit: boolean };

/**
 * story가 true인 열은 역량 행마다 다르고, 아니면 경험 하나에 한 칸으로 병합한다.
 * width는 처음 폭(px)이고 머리글 오른쪽 끝을 끌어 바꾼다. 활동 내용은 폭을 정하지 않아 남는 폭을 모두 쓴다.
 */
const COLUMNS: { key: Column; label: string; story: boolean; width: number | null }[] = [
  { key: "title", label: "제목", story: false, width: 208 },
  { key: "type", label: "구분", story: false, width: 104 },
  { key: "period", label: "기간", story: false, width: 184 },
  { key: "organization", label: "소속", story: false, width: 128 },
  { key: "role", label: "역할", story: false, width: 120 },
  { key: "tags", label: "역량 태그", story: true, width: 176 },
  { key: "content", label: "활동 내용", story: true, width: null },
  { key: "result", label: "성과", story: true, width: 240 },
];
const DEFAULT_WIDTHS = Object.fromEntries(COLUMNS.flatMap(({ key, width }) => (width ? [[key, width]] : []))) as Partial<Record<Column, number>>;
const COLUMN_MIN = 64;
const COLUMN_MAX = 720;
/** 행 번호 열과 행 메뉴 열의 폭. 활동 내용 열은 이보다 좁아지지 않는다 */
const NUMBER_WIDTH = 48;
const ACTIONS_WIDTH = 40;
const CONTENT_MIN = 320;
/** 표 안에서 바로 적는 칸과 그 글자 수. 나머지 칸은 누르면 팝오버가 열린다 */
const TEXT_MAX: Partial<Record<Column, number>> = { title: TITLE_MAX, organization: SHORT_MAX, role: SHORT_MAX };
/** 여러 줄로 적는 칸 */
const LONG: Partial<Record<Column, true>> = { content: true, result: true };
const LAST = COLUMNS.length - 1;
const SKELETON_ROWS = 6;
/** 엑셀처럼 열에 붙이는 글자. 수식 입력줄의 셀 주소(B3)에 쓴다 */
const LETTERS = "ABCDEFGH";
const colOf = (column: Column) => COLUMNS.findIndex(({ key }) => key === column);

/** 시트의 한 줄은 역량 행 하나다. 경험 열은 경험의 첫 줄에만 있다. band는 경험을 한 개씩 걸러 바탕을 까는 줄무늬다 */
type SheetRow = { exp: Experience; story: Story; first: boolean; band: boolean };

/** 수식 입력줄에 보이는 셀 내용 */
function cellText({ exp, story }: SheetRow, column: Column) {
  switch (column) {
    case "type":
      return exp.type ? ACTIVITY_LABEL[exp.type] : "";
    case "period":
      return formatPeriod(exp) ?? "";
    case "tags":
      return story.tags.join(", ");
    case "content":
    case "result":
      return story[column];
    default:
      return exp[column];
  }
}

type Editing = { expId: string; storyId: string | null; column: Column; draft: string; anchor: HTMLElement | null };
type Menu = { expId: string; storyId: string; anchor: HTMLElement };

type Props = {
  /** 보이는 경험과 역량 행. null이면 불러오는 중이다 */
  items: Experience[] | null;
  rowHeight: RowHeight;
  status: Record<string, CellStatus>;
  custom: string[];
  focus: FocusRequest | null;
  empty: ReactNode;
  onChange: (expId: string, storyId: string | null, column: Column, patch: Patch) => void;
  onOpen: (expId: string) => void;
  onAddStory: (expId: string) => void;
  onDuplicateStory: (expId: string, storyId: string) => void;
  onRemoveStory: (expId: string, storyId: string) => void;
  onDuplicate: (expId: string) => void;
  onAdd: () => void;
};

/** 엑셀처럼 셀을 골라 고치는 표. 경험 정보는 세로로 병합하고, 옆에 역량 행을 나눠 쓴다 */
export function ExperienceTable({ items, rowHeight, status, custom, focus, empty, onChange, onOpen, onAddStory, onDuplicateStory, onRemoveStory, onDuplicate, onAdd }: Props) {
  const table = useRef<HTMLTableElement>(null);
  const [active, setActive] = useState<{ expId: string; storyId: string; col: number } | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const refocus = useRef(false);
  const [seenFocus, setSeenFocus] = useState<string | null>(null);
  const [widths, setWidths] = useState(DEFAULT_WIDTHS);
  const rows = items ?? [];
  const sheet: SheetRow[] = rows.flatMap((exp, index) => exp.stories.map((story, i) => ({ exp, story, first: i === 0, band: index % 2 === 1 })));
  const tableWidth = NUMBER_WIDTH + ACTIONS_WIDTH + CONTENT_MIN + Object.values(widths).reduce((sum, width) => sum + width, 0);
  const resize = (column: Column) => (width: number) => setWidths((current) => ({ ...current, [column]: width }));

  /** 경험 열이면 그 경험의 첫 줄로 맞춘다(병합한 셀은 첫 줄에만 있다) */
  function normalize(row: number, col: number) {
    if (COLUMNS[col].story) return row;
    while (row > 0 && !sheet[row].first) row -= 1;
    return row;
  }
  const exists = (row: number, col: number) => COLUMNS[col].story || sheet[row].first;
  const indexOf = (expId: string, storyId: string, col: number) => sheet.findIndex(({ exp, story, first }) => exp.id === expId && (COLUMNS[col].story ? story.id === storyId : first));

  if (focus && focus.key !== seenFocus) {
    const col = colOf(focus.column);
    const row = indexOf(focus.expId, focus.storyId, col);
    if (row >= 0) {
      setSeenFocus(focus.key);
      setActive({ expId: focus.expId, storyId: focus.storyId, col });
      if (focus.edit) setEditing({ expId: focus.expId, storyId: COLUMNS[col].story ? focus.storyId : null, column: focus.column, draft: "", anchor: null });
    }
  }

  const activeRow = active ? indexOf(active.expId, active.storyId, active.col) : -1;

  // 편집을 마치거나 키보드로 움직이거나 새 행을 고르라는 요청이 오면 고른 셀로 포커스를 돌려준다
  const focusedKey = useRef<string | null>(null);
  useEffect(() => {
    const requested = focus !== null && focus.key === seenFocus && focusedKey.current !== focus.key;
    if ((!refocus.current && !requested) || editing || !active || activeRow < 0) return;
    refocus.current = false;
    if (requested) focusedKey.current = focus.key;
    const cell = table.current?.querySelector<HTMLElement>(`[data-cell="${activeRow}:${active.col}"]`);
    cell?.focus();
    cell?.scrollIntoView({ block: "nearest", inline: "nearest" });
  });

  function select(row: number, col: number) {
    setActive({ expId: sheet[row].exp.id, storyId: sheet[row].story.id, col });
    refocus.current = true;
  }

  function edit(row: number, col: number, anchor: HTMLElement, typed?: string) {
    const target = sheet[row];
    const column = COLUMNS[col].key;
    setActive({ expId: target.exp.id, storyId: target.story.id, col });
    setEditing({ expId: target.exp.id, storyId: COLUMNS[col].story ? target.story.id : null, column, draft: typed ?? (TEXT_MAX[column] ? cellText(target, column) : ""), anchor });
  }

  function finish() {
    setEditing(null);
    refocus.current = true;
  }

  /** 바뀐 값만 저장한다 */
  function apply(expId: string, storyId: string | null, column: Column, patch: Patch) {
    const exp = rows.find(({ id }) => id === expId);
    const before: Record<string, unknown> | undefined = storyId ? exp?.stories.find(({ id }) => id === storyId) : exp;
    if (before && Object.entries(patch).some(([key, value]) => JSON.stringify(before[key]) !== JSON.stringify(value))) onChange(expId, storyId, column, patch);
  }

  function commit(patch: Patch) {
    if (editing) apply(editing.expId, editing.storyId, editing.column, patch);
    finish();
  }

  /** Tab 순서로 by칸 옮긴 셀. 병합으로 비어 있는 자리는 건너뛴다. 표 밖이면 null */
  function step(row: number, col: number, by: number) {
    let at = row * COLUMNS.length + col + by;
    while (at >= 0 && at < sheet.length * COLUMNS.length && !exists(Math.floor(at / COLUMNS.length), at % COLUMNS.length)) at += by;
    if (at < 0 || at >= sheet.length * COLUMNS.length) return null;
    return { row: Math.floor(at / COLUMNS.length), col: at % COLUMNS.length };
  }

  function move(key: string, row: number, col: number, back: boolean): { row: number; col: number } | null | undefined {
    switch (key) {
      case "ArrowUp": {
        const above = normalize(row, col) - 1;
        return above >= 0 ? { row: normalize(above, col), col } : null;
      }
      case "ArrowDown": {
        let below = row + 1;
        if (!COLUMNS[col].story) while (below < sheet.length && !sheet[below].first) below += 1;
        return below < sheet.length ? { row: below, col } : null;
      }
      case "ArrowLeft":
        return col > 0 ? { row: normalize(row, col - 1), col: col - 1 } : null;
      case "ArrowRight":
        return col < LAST ? { row: normalize(row, col + 1), col: col + 1 } : null;
      case "Tab":
        return step(row, col, back ? -1 : 1);
    }
    return undefined;
  }

  function onCellKey(event: KeyboardEvent<HTMLTableCellElement>, row: number, col: number) {
    if (event.target !== event.currentTarget) return;
    const target = move(event.key, row, col, event.shiftKey);
    if (target !== undefined) {
      // 표 끝에서 누른 Tab은 브라우저에 맡겨 표 밖으로 나간다
      if (target === null) return event.key === "Tab" ? undefined : event.preventDefault();
      event.preventDefault();
      return select(target.row, target.col);
    }
    if (event.key === "Enter" || event.key === "F2") {
      event.preventDefault();
      return edit(row, col, event.currentTarget);
    }
    // 고른 칸에서 바로 글자를 치면 그 글자로 편집을 시작한다
    if (TEXT_MAX[COLUMNS[col].key] && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      edit(row, col, event.currentTarget, event.key);
    }
  }

  const editingRow = editing && sheet.find(({ exp, story, first }) => exp.id === editing.expId && (editing.storyId ? story.id === editing.storyId : first));
  const activeSheetRow = sheet[activeRow];
  const activeColumn = active && activeSheetRow ? COLUMNS[active.col].key : null;

  return (
    <div className={styles.sheet}>
      <div className={styles.formula}>
        <span className={styles.address} aria-label="선택한 셀">
          {activeColumn && `${LETTERS[active!.col]}${activeRow + 1}`}
        </span>
        <span className={styles.fx} aria-hidden="true">
          fx
        </span>
        {activeSheetRow && activeColumn ? (
          <FormulaInput
            key={`${activeRow}:${active!.col}:${cellText(activeSheetRow, activeColumn)}`}
            label={COLUMNS[active!.col].label}
            value={cellText(activeSheetRow, activeColumn)}
            max={LONG[activeColumn] ? LONG_MAX : TEXT_MAX[activeColumn]}
            multiline={Boolean(LONG[activeColumn])}
            onCommit={(value) => apply(activeSheetRow.exp.id, COLUMNS[active!.col].story ? activeSheetRow.story.id : null, activeColumn, { [activeColumn]: value.trim() })}
            onDone={() => select(activeRow, active!.col)}
          />
        ) : (
          <input className={styles.formulaInput} aria-label="셀 내용" placeholder="셀을 고르면 내용이 여기에 보여요" disabled />
        )}
      </div>
      <div className={styles.scroll}>
        <table ref={table} className={styles.table} style={{ minWidth: tableWidth }} role="grid" aria-label="경험 목록" aria-busy={items === null} data-height={rowHeight}>
          <colgroup>
            <col style={{ width: NUMBER_WIDTH }} />
            {COLUMNS.map(({ key }) => (
              <col key={key} style={{ width: widths[key] }} />
            ))}
            <col style={{ width: ACTIONS_WIDTH }} />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className={styles.number}>
                <span className={styles.hidden}>번호</span>
              </th>
              {COLUMNS.map(({ key, label, story }, col) => (
                <th key={key} scope="col" className={cn(key === "title" && styles.sticky, story && styles.storyHead, active?.col === col && activeColumn && styles.current)}>
                  <span className={styles.letter} aria-hidden="true">
                    {LETTERS[col]}
                  </span>
                  {label}
                  {key === "title" && <span className={styles.required}>*</span>}
                  {widths[key] !== undefined && (
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      aria-label={`${label} 열 폭`}
                      aria-valuenow={widths[key]}
                      aria-valuemin={COLUMN_MIN}
                      aria-valuemax={COLUMN_MAX}
                      tabIndex={0}
                      title="끌어서 폭 조절 · 두 번 누르면 처음 폭"
                      className={styles.resizer}
                      onPointerDown={(event) => startResize(event, widths[key]!, "right", COLUMN_MIN, COLUMN_MAX, resize(key))}
                      onKeyDown={(event) => resizeByKey(event, widths[key]!, "right", COLUMN_MIN, COLUMN_MAX, resize(key))}
                      onDoubleClick={() => resize(key)(DEFAULT_WIDTHS[key]!)}
                    />
                  )}
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
            {sheet.map((line, row) => {
              const { exp, story, band } = line;
              const name = exp.title || "새 경험";
              return (
                <tr key={story.id} className={cn(band && styles.band)}>
                  <td className={cn(styles.number, row === activeRow && styles.current)}>
                    {!story.content.trim() && (
                      <span className={styles.dot} tabIndex={0}>
                        <span className={styles.tip}>활동 내용을 아직 안 적었어요</span>
                      </span>
                    )}
                    {row + 1}
                  </td>
                  {COLUMNS.map(({ key, label, story: perStory }, col) => {
                    if (!exists(row, col)) return null;
                    const isActive = active ? row === activeRow && active.col === col : row === 0 && col === 0;
                    const isEditing = editing?.expId === exp.id && editing.column === key && (!perStory || editing.storyId === story.id);
                    const saved = status[cellKey(exp.id, perStory ? story.id : null, key)];
                    const error = (typeof saved === "object" && saved.error) || (key === "title" && titleError(exp.title)) || null;
                    const inline = isEditing && TEXT_MAX[key] !== undefined;
                    return (
                      <td
                        key={key}
                        data-cell={`${row}:${col}`}
                        rowSpan={perStory ? undefined : exp.stories.length}
                        tabIndex={isActive && !inline ? 0 : -1}
                        aria-selected={isActive}
                        aria-invalid={error ? true : undefined}
                        className={cn(styles.cell, key === "title" && styles.sticky, isActive && styles.active, isEditing && styles.editing, error && styles.error)}
                        onClick={(event) => {
                          if (isEditing) return;
                          if (!TEXT_MAX[key] || isActive) edit(row, col, event.currentTarget);
                          else select(row, col);
                        }}
                        onDoubleClick={(event) => TEXT_MAX[key] && !isEditing && edit(row, col, event.currentTarget)}
                        onKeyDown={(event) => onCellKey(event, row, col)}
                      >
                        <div className={styles.inner}>
                          {inline ? (
                            <InlineInput
                              label={label}
                              initial={editing.draft}
                              max={TEXT_MAX[key]!}
                              onCommit={(value, by) => {
                                commit({ [key]: value.trim() });
                                const next = by && step(row, col, by);
                                if (next) select(next.row, next.col);
                              }}
                              onCancel={finish}
                            />
                          ) : (
                            <Value line={line} column={key} />
                          )}
                          <Status value={saved} />
                        </div>
                        {error && !isEditing && <span className={styles.tip}>{error}</span>}
                      </td>
                    );
                  })}
                  {/* 행 메뉴 하나만 둔다. 줄에 마우스를 올리거나 포커스가 있을 때만 보인다 */}
                  <td className={styles.actions}>
                    <button
                      type="button"
                      className={styles.more}
                      aria-label={`${name} ${row + 1}행 메뉴`}
                      title="상세 열기 · 역량 추가 · 복제 · 삭제"
                      aria-haspopup="dialog"
                      aria-expanded={menu?.storyId === story.id}
                      onClick={(event) => setMenu({ expId: exp.id, storyId: story.id, anchor: event.currentTarget })}
                    >
                      ⋯
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {sheet.length > 0 && (
            <tfoot>
              <tr>
                <td className={styles.number} aria-hidden="true">
                  <Icon name="plus" size={14} />
                </td>
                <td colSpan={COLUMNS.length + 1}>
                  <button type="button" className={styles.add} onClick={onAdd}>
                    새 경험 추가
                  </button>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {editing?.anchor && editingRow && !TEXT_MAX[editing.column] && (
        <CellEditor
          key={`${editing.expId}:${editing.storyId}:${editing.column}`}
          line={editingRow}
          column={editing.column}
          anchor={editing.anchor}
          custom={custom}
          onChange={(patch) => onChange(editing.expId, editing.storyId, editing.column, patch)}
          onCommit={commit}
          onCancel={finish}
        />
      )}
      {menu && (
        <Popover anchor={menu.anchor} label="행 메뉴" onClose={() => setMenu(null)}>
          <div className={styles.menu}>
            {(
              [
                ["상세 열기", () => onOpen(menu.expId)],
                ["이 경험에 역량 추가", () => onAddStory(menu.expId)],
                null,
                ["이 역량 행 복제", () => onDuplicateStory(menu.expId, menu.storyId)],
                ["이 역량 행 삭제", () => onRemoveStory(menu.expId, menu.storyId), true],
                null,
                ["경험 복제", () => onDuplicate(menu.expId)],
              ] as const
            ).map((item, i) =>
              item ? (
                <button
                  key={item[0]}
                  type="button"
                  className={cn(item[2] && styles.danger)}
                  onClick={() => {
                    setMenu(null);
                    item[1]();
                  }}
                >
                  {item[0]}
                </button>
              ) : (
                <hr key={i} className={styles.divider} />
              ),
            )}
          </div>
        </Popover>
      )}
    </div>
  );
}

function Value({ line: { exp, story }, column }: { line: SheetRow; column: Column }) {
  switch (column) {
    case "type":
      return exp.type && <Chip size="sm">{ACTIVITY_LABEL[exp.type]}</Chip>;
    case "period":
      return <span className={cn(styles.text, !exp.startedOn && styles.muted)}>{formatPeriod(exp) ?? "기간 선택"}</span>;
    case "tags":
      if (story.tags.length === 0) return <span className={styles.muted}>+ 역량 고르기</span>;
      return (
        <span className={styles.tagList}>
          {story.tags.slice(0, 3).map((tag) => (
            <Chip key={tag} size="sm">
              {tag}
            </Chip>
          ))}
          {story.tags.length > 3 && <span className={styles.more}>+{story.tags.length - 3}</span>}
        </span>
      );
    case "content":
    case "result":
      return <span className={styles.clamp}>{story[column]}</span>;
    default:
      return <span className={styles.text}>{exp[column]}</span>;
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

type FormulaProps = { label: string; value: string; max?: number; multiline: boolean; onCommit: (value: string) => void; onDone: () => void };

/**
 * 수식 입력줄. 셀보다 넓어서 긴 글을 고치기 편하다. 글로 적는 칸(제목·소속·역할·활동 내용·성과)만 고칠 수 있고, 나머지는 셀을 눌러 고른다.
 * Enter는 저장, Esc는 되돌린다. 여러 줄 칸은 Shift+Enter로 줄을 바꾼다.
 */
function FormulaInput({ label, value, max, multiline, onCommit, onDone }: FormulaProps) {
  const [draft, setDraft] = useState(value);
  // Enter·Esc로 셀에 포커스를 돌려줄 때 생기는 blur는 저장하지 않는다
  const skipBlur = useRef(false);
  const editable = max !== undefined;
  const save = () => {
    if (skipBlur.current) {
      skipBlur.current = false;
      return;
    }
    if (draft !== value) onCommit(draft);
  };
  return (
    <textarea
      className={styles.formulaInput}
      aria-label={`${label} 내용`}
      rows={1}
      value={editable ? draft : value}
      maxLength={max}
      readOnly={!editable}
      title={editable ? undefined : "셀을 눌러 고르세요"}
      onChange={(event) => setDraft(multiline ? event.target.value : event.target.value.replace(/\n/g, ""))}
      onBlur={save}
      onKeyDown={(event) => {
        if (!editable || event.nativeEvent.isComposing) return;
        if (event.key === "Enter" && !(multiline && event.shiftKey)) {
          event.preventDefault();
          save();
          skipBlur.current = true;
          onDone();
        } else if (event.key === "Escape") {
          event.preventDefault();
          setDraft(value);
          skipBlur.current = true;
          onDone();
        }
      }}
    />
  );
}

/** by는 Tab(1)·Shift+Tab(-1)으로 끝내 옆 칸으로 갈 때다 */
function InlineInput({ label, initial, max, onCommit, onCancel }: { label: string; initial: string; max: number; onCommit: (value: string, by?: number) => void; onCancel: () => void }) {
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
  line: SheetRow;
  column: Column;
  anchor: HTMLElement;
  custom: string[];
  /** 팝오버를 닫지 않고 바로 저장한다(태그) */
  onChange: (patch: Patch) => void;
  onCommit: (patch: Patch) => void;
  onCancel: () => void;
};

/** 바깥을 누르면 적은 내용을 저장하고, Esc는 취소한다 */
function CellEditor({ line: { exp, story }, column, anchor, custom, onChange, onCommit, onCancel }: EditorProps) {
  const [period, setPeriod] = useState({ startedOn: exp.startedOn, endedOn: exp.endedOn });
  const [long, setLong] = useState(column === "content" || column === "result" ? story[column] : "");
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
            <button key={type ?? "none"} type="button" aria-pressed={exp.type === type} autoFocus={exp.type === type} onClick={() => onCommit({ type })}>
              {type ? ACTIVITY_LABEL[type] : <span className={styles.muted}>선택 안 함</span>}
              {exp.type === type && <Icon name="tick" size={16} />}
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
      <Popover anchor={anchor} label="역량 태그 고르기" onClose={onCancel}>
        <div className={styles.editor}>
          <p className={styles.muted}>이 행에서 보여 줄 역량을 골라요. 다른 역량은 ＋로 행을 나눠 적어요.</p>
          <TagPicker value={story.tags} custom={custom} onChange={(tags) => onChange({ tags })} />
        </div>
      </Popover>
    );
  }

  const label = column === "content" ? "활동 내용" : "성과";
  const save = () => onCommit({ [column]: long.trim() });
  return (
    <Popover anchor={anchor} label={`${label} 적기`} onClose={(reason) => (reason === "outside" ? save() : onCancel())}>
      <div className={styles.editor}>
        <textarea
          className={styles.textarea}
          aria-label={label}
          rows={column === "content" ? 8 : 5}
          maxLength={LONG_MAX}
          placeholder={column === "content" ? "어떤 상황에서 무엇을 맡았고, 어떻게 행동했는지 적어요." : "숫자로 말할 수 있는 결과가 있으면 함께 적어요."}
          value={long}
          onChange={(event) => setLong(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) save();
          }}
        />
        <div className={styles.editorFoot}>
          <span className={styles.muted}>Ctrl+Enter 완료 · Esc 취소</span>
          <Button className={styles.apply} onClick={save}>
            완료
          </Button>
        </div>
      </div>
    </Popover>
  );
}

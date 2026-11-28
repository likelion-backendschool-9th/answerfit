"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PATHS } from "@/app/_lib/paths";
import { Button } from "@/components/ui/Button/Button";
import { FilterChips } from "@/components/ui/FilterChips/FilterChips";
import { Icon } from "@/components/ui/Icon/Icon";
import { Modal } from "@/components/ui/Modal/Modal";
import { SearchField } from "@/components/ui/SearchField/SearchField";
import { SelectField } from "@/components/ui/SelectField/SelectField";
import { removeExperienceAction, saveExperienceAction } from "@/features/experience/actions";
import { ACTIVITY_LABEL, emptyExperience, filterExperiences, myTags, TAG_GROUPS, TITLE_MAX, titleError, type ExperienceFilter } from "@/features/experience/rules";
import { ACTIVITY_TYPES, type Column, type Experience } from "@/features/experience/types";
import { cn } from "@/lib/cn";
import { CompetencyMatrix } from "../CompetencyMatrix/CompetencyMatrix";
import { DetailPanel } from "../DetailPanel/DetailPanel";
import { ExperienceCards } from "../ExperienceCards/ExperienceCards";
import { cellKey, ExperienceTable, type CellStatus, type RowHeight } from "../ExperienceTable/ExperienceTable";
import { PasteImport } from "../PasteImport/PasteImport";
import styles from "./ExperienceBoard.module.css";

const NO_FILTER: ExperienceFilter = { type: null, tag: "", keyword: "" };
const ROW_HEIGHTS: [RowHeight, string][] = [
  ["one", "한 줄"],
  ["two", "두 줄"],
  ["all", "전체"],
];
/** 저장됨 체크가 보이는 시간 */
const SAVED_MS = 1500;
/** globals.css의 모바일 기준과 같다. 모바일에는 표가 없어 새 경험을 상세 화면에서 적는다 */
const DESKTOP = "(min-width: 40rem)";

/** items가 null이면 불러오는 중이다(행 스켈레톤) */
export function ExperienceBoard({ items: loaded }: { items: Experience[] | null }) {
  const router = useRouter();
  const [items, setItems] = useState(loaded ?? []);
  // 상세 화면에서 저장하고 돌아오면 서버가 새 목록을 준다
  const [source, setSource] = useState(loaded);
  if (loaded !== source) {
    setSource(loaded);
    setItems(loaded ?? []);
  }
  const [view, setView] = useState<"table" | "matrix">("table");
  const [filter, setFilter] = useState(NO_FILTER);
  const [rowHeight, setRowHeight] = useState<RowHeight>("one");
  const [status, setStatus] = useState<Record<string, CellStatus>>({});
  const [newRowId, setNewRowId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [pasting, setPasting] = useState(false);
  const loading = loaded === null;
  const shown = filterExperiences(items, filter);
  const custom = myTags(items);
  const filtered = filter.type !== null || filter.tag !== "" || filter.keyword.trim() !== "";

  function setCell(key: string, value: CellStatus | null) {
    setStatus((current) => {
      const next = { ...current };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
  }

  /** 제목이 없으면 저장하지 않는다. 제목 칸이 오류로 알린다 */
  async function save(experience: Experience, key: string) {
    if (titleError(experience.title)) return setCell(key, null);
    setCell(key, "saving");
    const result = await saveExperienceAction(experience).catch(() => ({ error: "저장하지 못했어요. 다시 시도해 주세요." }));
    if (result.error) return setCell(key, { error: result.error });
    setCell(key, "saved");
    // 그사이 다시 고쳐 저장 중이면 그 상태를 지우지 않는다
    setTimeout(() => setStatus((current) => (current[key] === "saved" ? Object.fromEntries(Object.entries(current).filter(([name]) => name !== key)) : current)), SAVED_MS);
  }

  function change(id: string, column: Column, patch: Partial<Experience>) {
    const current = items.find((item) => item.id === id);
    if (!current) return;
    const next = { ...current, ...patch };
    setItems((list) => list.map((item) => (item.id === id ? next : item)));
    void save(next, cellKey(id, column));
  }

  function add() {
    if (!window.matchMedia(DESKTOP).matches) return router.push(PATHS.experience("new"));
    const row = emptyExperience(crypto.randomUUID());
    setItems((list) => [...list, row]);
    // 새 행이 필터에 가려지지 않게 조건을 푼다
    setFilter(NO_FILTER);
    setView("table");
    setNewRowId(row.id);
  }

  function duplicate(id: string) {
    const original = items.find((item) => item.id === id);
    if (!original) return;
    const copy = { ...original, id: crypto.randomUUID(), title: `${original.title} (복사)`.slice(0, TITLE_MAX) };
    setItems((list) => list.flatMap((item) => (item.id === id ? [item, copy] : [item])));
    void save(copy, cellKey(copy.id, "title"));
  }

  const opened = items.find((item) => item.id === openId) ?? null;
  const blank = items.filter((item) => !item.content.trim()).length;
  const saving = Object.values(status).includes("saving");
  const statusText = [filtered ? `${shown.length}개 표시 / 전체 ${items.length}개` : `경험 ${items.length}개`, blank > 0 && `활동 내용 빈 행 ${blank}개`, saving && "저장 중…"].filter(Boolean).join(" · ");
  const pasteLink = (
    <button type="button" className={styles.link} onClick={() => setPasting(true)}>
      엑셀에서 붙여넣기
    </button>
  );

  return (
    <>
      <div className={styles.top}>
        <div>
          <h1 className={styles.title}>내 경험 정리하기</h1>
          <p className={styles.description}>짧은 내용은 표에서 바로 적고, 긴 내용은 행을 열어서 적어요</p>
        </div>
        <div className={styles.buttons}>
          <Button variant="outline" className={styles.button} disabled={loading} onClick={() => setPasting(true)}>
            붙여넣기로 가져오기
          </Button>
          <Button className={styles.button} disabled={loading} onClick={add}>
            <Icon name="plus" size={18} /> 경험 추가
          </Button>
        </div>
      </div>

      <div className={styles.sheet}>
        <div className={styles.ribbon}>
          <FilterChips
            label="활동 구분"
            chips={[
              { label: "전체", count: items.length, current: filter.type === null, onSelect: () => setFilter({ ...filter, type: null }) },
              ...ACTIVITY_TYPES.map((type) => ({ label: ACTIVITY_LABEL[type], count: items.filter((item) => item.type === type).length, current: filter.type === type, onSelect: () => setFilter({ ...filter, type }) })),
            ]}
          />
          <div className={styles.tools}>
            <SelectField label="태그" value={filter.tag} options={{ "": "모든 태그" }} groups={{ ...TAG_GROUPS, ...(custom.length > 0 && { "내 태그": custom }) }} onChange={(event) => setFilter({ ...filter, tag: event.target.value })} />
            <SearchField label="제목·내용 검색" size="sm" className={styles.search} value={filter.keyword} onChange={(event) => setFilter({ ...filter, keyword: event.target.value })} />
            {view === "table" && (
              <div className={styles.segments} role="radiogroup" aria-label="행 높이">
                <span className={styles.segmentsLabel} aria-hidden="true">
                  행 높이
                </span>
                {ROW_HEIGHTS.map(([value, label]) => (
                  <button key={value} type="button" role="radio" aria-checked={rowHeight === value} className={styles.segment} onClick={() => setRowHeight(value)}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div id="experience-view" role="tabpanel" aria-labelledby={`tab-${view}`} className={styles.view}>
          {view === "matrix" ? (
            <CompetencyMatrix items={shown} />
          ) : (
            <>
              <div className={styles.desktop}>
                <ExperienceTable
                  items={loading ? null : shown}
                  rowHeight={rowHeight}
                  status={status}
                  custom={custom}
                  newRowId={newRowId}
                  empty={
                    filtered ? (
                      <p className={styles.muted}>조건에 맞는 경험이 없어요.</p>
                    ) : (
                      <div className={styles.empty}>
                        <p>아직 정리한 경험이 없어요. 첫 행을 추가해 보세요.</p>
                        <Button className={styles.button} onClick={add}>
                          경험 추가
                        </Button>
                        {pasteLink}
                      </div>
                    )
                  }
                  onChange={change}
                  onOpen={setOpenId}
                  onDuplicate={duplicate}
                  onRemove={setRemoveId}
                  onAdd={add}
                />
              </div>
              <div className={styles.mobile}>
                {!loading && shown.length === 0 ? (
                  <div className={cn(styles.empty, styles.box)}>
                    <p>{filtered ? "조건에 맞는 경험이 없어요." : "아직 정리한 경험이 없어요."}</p>
                    {!filtered && (
                      <Button className={styles.button} onClick={add}>
                        경험 추가
                      </Button>
                    )}
                  </div>
                ) : (
                  <ExperienceCards items={loading ? null : shown} />
                )}
              </div>
            </>
          )}
        </div>

        {/* 엑셀의 시트 탭과 상태 표시줄 */}
        <div className={styles.sheetBar}>
          <div className={styles.tabs} role="tablist" aria-label="보기">
            {(
              [
                ["table", "표"],
                ["matrix", "역량 매트릭스"],
              ] as const
            ).map(([value, label]) => (
              <button key={value} type="button" role="tab" id={`tab-${value}`} aria-selected={view === value} aria-controls="experience-view" className={styles.tab} onClick={() => setView(value)}>
                {label}
              </button>
            ))}
          </div>
          <p className={styles.status} aria-live="polite">
            {loading ? "불러오는 중…" : statusText}
          </p>
          {view === "table" && <p className={styles.hint}>방향키 이동 · Enter 편집 · Tab 다음 칸 · Esc 취소</p>}
        </div>
      </div>

      <DetailPanel
        experience={opened}
        custom={custom}
        onSaved={(next) => setItems((list) => list.map((item) => (item.id === next.id ? next : item)))}
        onClose={() => setOpenId(null)}
      />
      <PasteImport open={pasting} onClose={() => setPasting(false)} onImported={(rows) => setItems((list) => [...list, ...rows])} />
      <RemoveDialog id={removeId} onClose={() => setRemoveId(null)} onRemoved={(id) => setItems((list) => list.filter((item) => item.id !== id))} />
    </>
  );
}

/** 지우면 되돌릴 수 없으니 한 번 더 묻는다 */
function RemoveDialog({ id, onClose, onRemoved }: { id: string | null; onClose: () => void; onRemoved: (id: string) => void }) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const close = () => {
    setError(undefined);
    onClose();
  };
  return (
    <Modal open={id !== null} title="경험을 삭제할까요?" description="삭제하면 되돌릴 수 없어요." size="sm" icon="trash" onClose={close}>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.dialogButtons}>
        <Button variant="outline" className={styles.button} onClick={close} disabled={pending}>
          취소
        </Button>
        <Button
          variant="danger"
          className={styles.button}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              if (!id) return;
              const result = await removeExperienceAction(id).catch(() => ({ error: "삭제하지 못했어요. 다시 시도해 주세요." }));
              if (result.error) return setError(result.error);
              onRemoved(id);
              close();
            })
          }
        >
          삭제하기
        </Button>
      </div>
    </Modal>
  );
}

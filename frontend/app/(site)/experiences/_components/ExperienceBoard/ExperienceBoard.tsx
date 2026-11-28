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
import { ACTIVITY_LABEL, customTags, emptyExperience, emptyStory, filterExperiences, STORIES_MAX, TAG_GROUPS, TITLE_MAX, titleError, type ExperienceFilter } from "@/features/experience/rules";
import { ACTIVITY_TYPES, type Column, type Experience, type Patch } from "@/features/experience/types";
import { cn } from "@/lib/cn";
import { CompetencyMatrix } from "../CompetencyMatrix/CompetencyMatrix";
import { DetailPanel } from "../DetailPanel/DetailPanel";
import { ExperienceCards } from "../ExperienceCards/ExperienceCards";
import { cellKey, ExperienceTable, type CellStatus, type FocusRequest, type RowHeight } from "../ExperienceTable/ExperienceTable";
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
const newId = () => crypto.randomUUID();

/** 지울 대상. storyId가 있으면 그 역량 행만, 없으면 경험 전체다 */
type Removal = { expId: string; storyId: string };

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
  const [focus, setFocus] = useState<FocusRequest | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [removal, setRemoval] = useState<Removal | null>(null);
  const [pasting, setPasting] = useState(false);
  const loading = loaded === null;
  const shown = filterExperiences(items, filter);
  const custom = customTags(items);
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

  /** 경험 하나를 바꾸고 바로 저장한다. 바꾼 셀(key)에 저장 상태를 띄운다 */
  function update(expId: string, transform: (experience: Experience) => Experience, key: string) {
    const current = items.find((item) => item.id === expId);
    if (!current) return;
    const next = transform(current);
    setItems((list) => list.map((item) => (item.id === expId ? next : item)));
    void save(next, key);
  }

  function change(expId: string, storyId: string | null, column: Column, patch: Patch) {
    update(
      expId,
      (experience) => (storyId ? { ...experience, stories: experience.stories.map((story) => (story.id === storyId ? { ...story, ...patch } : story)) } : { ...experience, ...patch }),
      cellKey(expId, storyId, column),
    );
  }

  function add() {
    if (!window.matchMedia(DESKTOP).matches) return router.push(PATHS.experience("new"));
    const row = emptyExperience(newId(), newId());
    setItems((list) => [...list, row]);
    // 새 행이 필터에 가려지지 않게 조건을 푼다
    setFilter(NO_FILTER);
    setView("table");
    setFocus({ key: row.id, expId: row.id, storyId: row.stories[0].id, column: "title", edit: true });
  }

  /** 같은 경험을 다른 역량으로 나눠 쓰는 행을 더하고 그 행의 역량 태그 칸을 고른다. after가 있으면 그 행을 복제해 바로 아래에 둔다 */
  function addStory(expId: string, after?: string) {
    const current = items.find((item) => item.id === expId);
    if (!current || current.stories.length >= STORIES_MAX) return;
    const source = current.stories.find((story) => story.id === after);
    const story = source ? { ...source, id: newId() } : emptyStory(newId());
    const at = source ? current.stories.indexOf(source) + 1 : current.stories.length;
    update(expId, (experience) => ({ ...experience, stories: experience.stories.toSpliced(at, 0, story) }), cellKey(expId, story.id, "tags"));
    // 태그 필터가 걸려 있으면 새 행이 가려지므로 태그 조건만 푼다
    setFilter((now) => ({ ...now, tag: "" }));
    setView("table");
    setFocus({ key: story.id, expId, storyId: story.id, column: "tags", edit: false });
  }

  function duplicate(expId: string) {
    const original = items.find((item) => item.id === expId);
    if (!original) return;
    const copy = { ...original, id: newId(), title: `${original.title} (복사)`.slice(0, TITLE_MAX), stories: original.stories.map((story) => ({ ...story, id: newId() })) };
    setItems((list) => list.flatMap((item) => (item.id === expId ? [item, copy] : [item])));
    void save(copy, cellKey(copy.id, null, "title"));
  }

  const opened = items.find((item) => item.id === openId) ?? null;
  const stories = items.flatMap((item) => item.stories);
  const blank = stories.filter((story) => !story.content.trim()).length;
  const saving = Object.values(status).includes("saving");
  const statusText = [filtered ? `${shown.length}개 표시 / 전체 ${items.length}개` : `경험 ${items.length}개 · 역량 행 ${stories.length}개`, blank > 0 && `활동 내용 빈 행 ${blank}개`, saving && "저장 중…"].filter(Boolean).join(" · ");
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
                  focus={focus}
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
                  onAddStory={addStory}
                  onDuplicateStory={addStory}
                  onRemoveStory={(expId, storyId) => setRemoval({ expId, storyId })}
                  onDuplicate={duplicate}
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
          {view === "table" && <p className={styles.hint}>방향키 이동 · Enter 편집 · Tab 다음 칸 · Esc 취소 · 행 끝 ⋯에서 상세 열기·역량 추가</p>}
        </div>
      </div>

      <DetailPanel
        experience={opened}
        custom={custom}
        onSaved={(next) => setItems((list) => list.map((item) => (item.id === next.id ? next : item)))}
        onClose={() => setOpenId(null)}
      />
      <PasteImport open={pasting} onClose={() => setPasting(false)} onImported={(rows) => setItems((list) => [...list, ...rows])} />
      <RemoveDialog
        removal={removal}
        experience={items.find((item) => item.id === removal?.expId)}
        onClose={() => setRemoval(null)}
        onDone={(expId, next) => setItems((list) => (next ? list.map((item) => (item.id === expId ? next : item)) : list.filter((item) => item.id !== expId)))}
      />
    </>
  );
}

type RemoveProps = { removal: Removal | null; experience: Experience | undefined; onClose: () => void; onDone: (expId: string, next: Experience | null) => void };

/** 지우면 되돌릴 수 없으니 한 번 더 묻는다. 마지막 역량 행을 지우면 경험이 통째로 지워진다 */
function RemoveDialog({ removal, experience, onClose, onDone }: RemoveProps) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  // 경험을 따로 지우는 메뉴는 없다. 역량 행이 하나 남았을 때 지우면 경험도 함께 지워진다
  const storyOnly = Boolean(experience && experience.stories.length > 1);
  const description = storyOnly ? "이 행의 역량 태그·활동 내용·성과가 지워져요." : "마지막 역량 행이라 경험 전체가 삭제돼요. 되돌릴 수 없어요.";
  const close = () => {
    setError(undefined);
    onClose();
  };

  async function run() {
    if (!removal || !experience) return;
    if (!storyOnly) {
      const result = await removeExperienceAction(removal.expId).catch(() => ({ error: "삭제하지 못했어요. 다시 시도해 주세요." }));
      if (result.error) return setError(result.error);
      onDone(removal.expId, null);
      return close();
    }
    const next = { ...experience, stories: experience.stories.filter((story) => story.id !== removal.storyId) };
    // 제목이 없어 아직 저장하지 않은 경험은 화면에서만 지운다
    if (!titleError(next.title)) {
      const result = await saveExperienceAction(next).catch(() => ({ error: "삭제하지 못했어요. 다시 시도해 주세요." }));
      if (result.error) return setError(result.error);
    }
    onDone(removal.expId, next);
    close();
  }

  return (
    <Modal open={removal !== null} title={storyOnly ? "이 역량 행을 삭제할까요?" : "경험을 삭제할까요?"} description={description} size="sm" icon="trash" onClose={close}>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.dialogButtons}>
        <Button variant="outline" className={styles.button} onClick={close} disabled={pending}>
          취소
        </Button>
        <Button variant="danger" className={styles.button} disabled={pending} onClick={() => startTransition(run)}>
          삭제하기
        </Button>
      </div>
    </Modal>
  );
}

import { AiBadge } from "@components/ai-button";
import { useState } from "react";
import dayjs from "dayjs";
import {
  Box,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from "@components/ui";
import {
  ExpandMoreOutlined as ExpandMoreIcon,
  StarBorderOutlined as StarBorderOutlinedIcon,
  StarOutlined as StarIcon,
} from "@components/ui/icons";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { EyeToggle } from "@pages/workspace/eye-toggle";
import { ItemParts, itemPartsOf } from "@pages/workspace/item-parts";
import { RelevanceBadge } from "@pages/workspace/relevance-badge";
import { Variant, Wording } from "@custom-types/variant-types";
import { Item, Section } from "@custom-types/vault-types";
import {
  entryColumns,
  getItemLabel,
  shorten,
} from "@shared/variant/item-label";
import {
  jobBullets,
  sortBulletsByVariant,
  sortItemsByVariant,
} from "@shared/variant/render";
import {
  computeBulletOrders,
  computeItemOrders,
} from "@shared/variant/variant-utils";
import { SortingIcons } from "@pages/editor-page/accordion/sorting-icons";
import {
  SortableRow,
  WORDING_LABELS,
  availableWordings,
  getDropIndex,
  useReorderSensors,
} from "@pages/editor-page/sections/job-section-items";
import { JobHeadline } from "@pages/editor-page/sections/job-headline";
import { JobLinks } from "@pages/editor-page/sections/job-links";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  activeVariantSelector,
  setBulletOrders,
  setBulletSelection,
  setItemOrders,
  setItemSelection,
} from "@store/jobs/jobs-slice";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { sectionsSelector } from "@store/vault/vault-slice";

/** Columns of the table: drag handle, tick, entry, wording, highlight, order buttons */
/** The Wording column only exists while some entry has bullets (otherwise it would only take room) */
function columnsFor(hasWording: boolean): string {
  return `32px 32px minmax(0, 1fr) ${hasWording ? "120px" : "0px"} 40px 64px`;
}

/** Inside the Entry cell: title, organisation, dates */
interface ShownColumns {
  hasOrganisation: boolean;
  hasDates: boolean;
}

/** The columns inside the Entry cell; organisation and dates only exist when an entry of the section has them */
function entryGrid({ hasOrganisation, hasDates }: ShownColumns): string {
  return `minmax(0, 1.4fr)${hasOrganisation ? " minmax(0, 1fr)" : ""}${hasDates ? " minmax(0, 0.9fr)" : ""}`;
}

/** Which of the optional columns a section needs (a summary or a skills group has neither) */
function shownColumnsOf(section: Section): ShownColumns {
  const all = section.items.map((item) => entryColumns(item, () => ""));
  return {
    hasOrganisation: all.some((entry) => entry.organisation !== ""),
    hasDates: all.some((entry) => entry.dates !== ""),
  };
}

/** True when some bullet has a Short, Long or Formal wording to choose from (otherwise the column would be empty) */
function useHasWording(): boolean {
  const sections = useAppSelector(sectionsSelector);
  const variant = useAppSelector(activeVariantSelector);
  return sections.some((section) =>
    section.items.some((item) =>
      jobBullets(item, variant.selection).some(
        (bullet) => availableWordings(item, bullet.id).length > 1
      )
    )
  );
}

/** How many entries and bullets this job shows, out of those in the vault */
function countShown(
  sections: Section[],
  selection: Variant["selection"],
  hiddenSections: string[]
): { entries: [number, number]; bullets: [number, number] } {
  const result = {
    entries: [0, 0] as [number, number],
    bullets: [0, 0] as [number, number],
  };
  for (const section of sections) {
    const isOn = !hiddenSections.includes(section.id);
    for (const item of section.items) {
      const isItemShown = selection[item.id]?.isVisible !== false;
      result.entries[1] += 1;
      if (isOn && isItemShown) {
        result.entries[0] += 1;
      }
      for (const bullet of jobBullets(item, selection)) {
        result.bullets[1] += 1;
        if (
          isOn &&
          isItemShown &&
          selection[item.id]?.bullets?.[bullet.id]?.isVisible !== false
        ) {
          result.bullets[0] += 1;
        }
      }
    }
  }
  return result;
}

interface BulletRowsProps {
  item: Item;
  isDimmed: boolean;
}

/** The bullets of one item, indented under it: tick, wording, order */
function BulletRows({ item, isDimmed }: BulletRowsProps): JSX.Element {
  const hasWording = useHasWording();
  const dispatch = useAppDispatch();
  const variant = useAppSelector(activeVariantSelector);
  const sensors = useReorderSensors();
  const bullets = sortBulletsByVariant(item, variant.selection);
  const ids = bullets.map((b) => b.id);

  function moveBullet(bulletId: string, toIndex: number): void {
    dispatch(
      setBulletOrders({
        jobId: variant.id,
        itemId: item.id,
        orders: computeBulletOrders(item, variant, bulletId, toIndex),
      })
    );
  }

  function handleDragEnd(event: DragEndEvent): void {
    const index = getDropIndex(ids, event);
    if (index !== null) {
      moveBullet(String(event.active.id), index);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {bullets.map((bullet, index) => {
          const choice = variant.selection[item.id]?.bullets?.[bullet.id];
          const isShown = choice?.isVisible !== false;
          const wordings: Wording[] = availableWordings(item, bullet.id);
          return (
            <SortableRow key={bullet.id} id={bullet.id}>
              {(handle) => (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: columnsFor(hasWording),
                    alignItems: "center",
                    columnGap: 1,
                    minHeight: 44,
                    pl: 4.5,
                    pr: 2.5,
                    borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
                    bgcolor: WORKSPACE_COLORS.panelAlt,
                  }}
                >
                  {handle}
                  <EyeToggle
                    isShown={isShown}
                    label={`bullet: ${shorten(bullet.text)}`}
                    onChange={(next) =>
                      dispatch(
                        setBulletSelection({
                          jobId: variant.id,
                          itemId: item.id,
                          bulletId: bullet.id,
                          change: { isVisible: next },
                        })
                      )
                    }
                  />
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      minWidth: 0,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 13.5,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color:
                          isShown && !isDimmed
                            ? WORKSPACE_COLORS.text
                            : WORKSPACE_COLORS.muted,
                      }}
                    >
                      {bullet.text}
                    </Typography>
                    {choice?.relevance !== undefined && (
                      <RelevanceBadge
                        relevance={choice.relevance}
                        reason={choice.relevanceReason}
                      />
                    )}
                  </Box>
                  <Box>
                    {wordings.length > 1 && (
                      <TextField
                        select
                        size="small"
                        value={choice?.wording ?? "text"}
                        slotProps={{
                          htmlInput: {
                            "aria-label": `Wording for ${shorten(bullet.text, 40)}`,
                          },
                        }}
                        onChange={(event) =>
                          dispatch(
                            setBulletSelection({
                              jobId: variant.id,
                              itemId: item.id,
                              bulletId: bullet.id,
                              change: {
                                wording: event.target.value as Wording,
                              },
                            })
                          )
                        }
                        sx={{ width: 124 }}
                      >
                        {wordings.map((w) => (
                          <MenuItem key={w} value={w}>
                            {WORDING_LABELS[w]}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                    {variant.selection[item.id]?.generated?.some(
                      (made) => made.id === bullet.id
                    ) && <AiBadge />}
                  </Box>
                  <SortingIcons
                    index={index}
                    swapFunction={(_from, toIndex) =>
                      moveBullet(bullet.id, toIndex)
                    }
                    isLastEntity={index === bullets.length - 1}
                  />
                </Box>
              )}
            </SortableRow>
          );
        })}
      </SortableContext>
    </DndContext>
  );
}

/** The column titles above the entries of one section (skills have no organisation or dates) */
function ColumnHeader({
  columns,
  hasWording,
}: {
  columns: ShownColumns;
  hasWording: boolean;
}): JSX.Element {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: columnsFor(hasWording),
        columnGap: 1,
        px: 2.5,
        py: 1,
        borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: WORKSPACE_COLORS.muted,
      }}
    >
      <span />
      <span />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: entryGrid(columns),
          columnGap: 1,
        }}
      >
        <span>Entry</span>
        {columns.hasOrganisation && <span>Organisation</span>}
        {columns.hasDates && <span>Dates</span>}
      </Box>
      <span>{hasWording ? "Wording" : ""}</span>
      <StarBorderOutlinedIcon
        titleAccess="Highlight"
        sx={{ fontSize: 16, justifySelf: "center" }}
      />
      <span />
    </Box>
  );
}

interface SectionRowsProps {
  section: Section;
  isOn: boolean;
}

/** The section row (with its switch) and, when it is shown, the entries of the section */
function SectionRows({ section, isOn }: SectionRowsProps): JSX.Element {
  const hasWording = useHasWording();
  const dispatch = useAppDispatch();
  const variant = useAppSelector(activeVariantSelector);
  const { dateFormat } = useAppSelector(styleSelector);
  const sensors = useReorderSensors();
  const [openIds, setOpenIds] = useState<string[]>([]);
  const items = sortItemsByVariant(section.items, variant.selection);
  const shown = shownColumnsOf(section);
  const ids = items.map((i) => i.id);
  const shownCount = items.filter(
    (i) => variant.selection[i.id]?.isVisible !== false
  ).length;

  function moveItem(itemId: string, toIndex: number): void {
    dispatch(
      setItemOrders({
        jobId: variant.id,
        orders: computeItemOrders(section.items, variant, itemId, toIndex),
      })
    );
  }

  function toggleOpen(id: string): void {
    setOpenIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  }

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          minHeight: 48,
          px: 2.5,
          bgcolor: WORKSPACE_COLORS.panelAlt,
          borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
        }}
      >
        <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
          {section.title}
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: WORKSPACE_COLORS.muted }}>
          {isOn
            ? `${shownCount} of ${items.length} shown`
            : "Removed from this job on the template"}
        </Typography>
      </Box>
      {isOn && items.length > 0 && (
        <ColumnHeader columns={shown} hasWording={hasWording} />
      )}
      {isOn && items.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(event) => {
            const index = getDropIndex(ids, event);
            if (index !== null) {
              moveItem(String(event.active.id), index);
            }
          }}
        >
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {items.map((item, index) => {
              const selection = variant.selection[item.id];
              const isShown = selection?.isVisible !== false;
              const isHighlighted = selection?.emphasis === "high";
              const isOpen = openIds.includes(item.id);
              const label = getItemLabel(item);
              const columns = entryColumns(item, (day) =>
                dayjs(day).format(dateFormat)
              );
              const itemBullets = jobBullets(item, variant.selection);
              const hasParts =
                section.type !== "skills" &&
                itemPartsOf(section, item).length > 0;
              const bulletsShown = itemBullets.filter(
                (b) => selection?.bullets?.[b.id]?.isVisible !== false
              ).length;
              return (
                <SortableRow key={item.id} id={item.id}>
                  {(handle) => (
                    <Box data-testid="job-content-item">
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: columnsFor(hasWording),
                          alignItems: "center",
                          columnGap: 1,
                          minHeight: 52,
                          px: 2.5,
                          borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
                          bgcolor: isShown
                            ? WORKSPACE_COLORS.panel
                            : WORKSPACE_COLORS.panelAlt,
                        }}
                      >
                        {handle}
                        <EyeToggle
                          isShown={isShown}
                          label={label}
                          onChange={(next) =>
                            dispatch(
                              setItemSelection({
                                jobId: variant.id,
                                itemId: item.id,
                                change: { isVisible: next },
                              })
                            )
                          }
                        />
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: entryGrid(shown),
                            columnGap: 1,
                            alignItems: "center",
                            minWidth: 0,
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                              minWidth: 0,
                            }}
                          >
                            {(itemBullets.length > 0 || hasParts) && (
                              <IconButton
                                size="small"
                                aria-expanded={isOpen}
                                aria-label={`${isOpen ? "Collapse" : "Expand"} ${label}`}
                                onClick={() => toggleOpen(item.id)}
                              >
                                <ExpandMoreIcon
                                  fontSize="small"
                                  sx={{
                                    transform: isOpen
                                      ? "none"
                                      : "rotate(-90deg)",
                                  }}
                                />
                              </IconButton>
                            )}
                            <Box
                              sx={{
                                minWidth: 0,
                                color: isShown
                                  ? WORKSPACE_COLORS.text
                                  : WORKSPACE_COLORS.muted,
                              }}
                            >
                              <Typography
                                noWrap
                                sx={{ fontSize: 14, fontWeight: 600 }}
                              >
                                {label}
                              </Typography>
                            </Box>
                            {selection?.relevance !== undefined && (
                              <Box sx={{ ml: 1 }}>
                                <RelevanceBadge
                                  relevance={selection.relevance}
                                  reason={selection.relevanceReason}
                                />
                              </Box>
                            )}
                            {itemBullets.length > 0 && (
                              <Typography
                                sx={{
                                  flex: "none",
                                  ml: 1,
                                  fontSize: 12,
                                  color: WORKSPACE_COLORS.muted,
                                }}
                              >
                                {bulletsShown} of {itemBullets.length}
                              </Typography>
                            )}
                          </Box>
                          {shown.hasOrganisation && (
                            <Box
                              sx={{
                                minWidth: 0,
                                color: isShown
                                  ? WORKSPACE_COLORS.text
                                  : WORKSPACE_COLORS.muted,
                              }}
                            >
                              <Typography noWrap sx={{ fontSize: 13 }}>
                                {columns.organisation}
                              </Typography>
                              {columns.location && (
                                <Typography
                                  noWrap
                                  sx={{
                                    fontSize: 11.5,
                                    color: WORKSPACE_COLORS.muted,
                                  }}
                                >
                                  {columns.location}
                                </Typography>
                              )}
                            </Box>
                          )}
                          {shown.hasDates && (
                            <Typography
                              noWrap
                              sx={{
                                fontSize: 12.5,
                                color: isShown
                                  ? WORKSPACE_COLORS.text
                                  : WORKSPACE_COLORS.muted,
                              }}
                            >
                              {columns.dates}
                            </Typography>
                          )}
                        </Box>
                        <span />
                        <IconButton
                          size="small"
                          aria-label={`Highlight ${label}`}
                          aria-pressed={isHighlighted}
                          title={
                            isHighlighted
                              ? "Highlighted. Click to remove."
                              : "Highlight this entry on the CV"
                          }
                          color={isHighlighted ? "primary" : "default"}
                          onClick={() =>
                            dispatch(
                              setItemSelection({
                                jobId: variant.id,
                                itemId: item.id,
                                change: {
                                  emphasis: isHighlighted ? "normal" : "high",
                                },
                              })
                            )
                          }
                        >
                          {isHighlighted ? (
                            <StarIcon fontSize="small" />
                          ) : (
                            <StarBorderOutlinedIcon fontSize="small" />
                          )}
                        </IconButton>
                        <SortingIcons
                          index={index}
                          swapFunction={(_from, toIndex) =>
                            moveItem(item.id, toIndex)
                          }
                          isLastEntity={index === items.length - 1}
                        />
                      </Box>
                      {isOpen && hasParts && (
                        <ItemParts
                          section={section}
                          item={item}
                          isDimmed={!isShown}
                        />
                      )}
                      {isOpen && <BulletRows item={item} isDimmed={!isShown} />}
                    </Box>
                  )}
                </SortableRow>
              );
            })}
          </SortableContext>
        </DndContext>
      )}
    </>
  );
}

/**
 * The Content tab: which sections and entries this job shows, in what order, with which
 * wording and highlight. Changes apply at once and only change the job.
 */
export function JobContent({
  only,
}: {
  /** Show just this section (its id), or just the header and links ("header") */
  only?: string;
}): JSX.Element {
  const sections = useAppSelector(sectionsSelector);
  const variant = useAppSelector(activeVariantSelector);
  const hidden = variant.hiddenSections ?? [];
  const counts = countShown(sections, variant.selection, hidden);

  return (
    <Box
      component="section"
      sx={{
        border: `1px solid ${WORKSPACE_COLORS.border}`,
        borderRadius: 1.5,
        bgcolor: WORKSPACE_COLORS.panel,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 1.75,
          display: only === undefined ? "flex" : "none",
          gap: 1.5,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 600, fontSize: 15 }}>
            What appears on this CV
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: WORKSPACE_COLORS.muted }}>
            Untick to hide from this job only. Your vault keeps everything. Drag
            the dots to reorder entries inside a section.
          </Typography>
        </Box>
        <Typography sx={{ fontSize: 12.5, textAlign: "right" }}>
          {counts.entries[0]} of {counts.entries[1]}{" "}
          {counts.entries[1] === 1 ? "entry" : "entries"}
          {" · "}
          {counts.bullets[0]} of {counts.bullets[1]}{" "}
          {counts.bullets[1] === 1 ? "bullet" : "bullets"}
        </Typography>
      </Box>
      {sections
        .filter((section) => only === undefined || section.id === only)
        .map((section) => (
          <SectionRows
            key={section.id}
            section={section}
            isOn={!hidden.includes(section.id)}
          />
        ))}
      {(only === undefined || only === "header") && (
        <JobHeadline hasScoring={only === undefined} />
      )}
      {(only === undefined || only === "header") && <JobLinks />}
    </Box>
  );
}

import { useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  IconButton,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import StarBorderOutlinedIcon from "@mui/icons-material/StarBorderOutlined";
import StarIcon from "@mui/icons-material/Star";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Variant, Wording } from "@custom-types/variant-types";
import { Item, Section } from "@custom-types/vault-types";
import { getItemLabel, shorten } from "@shared/variant/item-label";
import {
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
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  activeVariantSelector,
  setBulletOrders,
  setBulletSelection,
  setItemOrders,
  setItemSelection,
  setSectionShown,
} from "@store/jobs/jobs-slice";
import { sectionsSelector } from "@store/vault/vault-slice";

/** Columns of the table: drag handle, tick, entry, wording, highlight, order buttons */
const COLUMNS = "32px 28px minmax(0, 1fr) 132px 112px 72px";

const SUBTITLE_FIELDS = ["company", "institute", "institution", "subtitle"];

/** "Acme · London": the first filled-in company-like field and the location */
function getItemSubtitle(item: Item): string {
  const first = SUBTITLE_FIELDS.map((key) => item.fields[key]?.trim()).find(
    Boolean
  );
  return [first, item.fields.location?.trim()].filter(Boolean).join(" · ");
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
      for (const bullet of item.bullets) {
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
                    gridTemplateColumns: COLUMNS,
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
                  <Checkbox
                    size="small"
                    checked={isShown}
                    slotProps={{
                      input: {
                        "aria-label": `Show bullet: ${shorten(bullet.text)}`,
                      },
                    }}
                    onChange={(event) =>
                      dispatch(
                        setBulletSelection({
                          jobId: variant.id,
                          itemId: item.id,
                          bulletId: bullet.id,
                          change: { isVisible: event.target.checked },
                        })
                      )
                    }
                  />
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
                    {shorten(bullet.text)}
                  </Typography>
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
                  <span />
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

interface SectionRowsProps {
  section: Section;
  isOn: boolean;
}

/** The section row (with its switch) and, when it is shown, the entries of the section */
function SectionRows({ section, isOn }: SectionRowsProps): JSX.Element {
  const dispatch = useAppDispatch();
  const variant = useAppSelector(activeVariantSelector);
  const sensors = useReorderSensors();
  const [openIds, setOpenIds] = useState<string[]>([]);
  const items = sortItemsByVariant(section.items, variant.selection);
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
            : "Hidden from this job"}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Typography
          component="label"
          htmlFor={`show-section-${section.id}`}
          sx={{ fontSize: 12.5 }}
        >
          Show section
        </Typography>
        <Switch
          id={`show-section-${section.id}`}
          checked={isOn}
          slotProps={{
            input: { "aria-label": `Show section ${section.title}` },
          }}
          onChange={(event) =>
            dispatch(
              setSectionShown({
                jobId: variant.id,
                sectionId: section.id,
                isShown: event.target.checked,
              })
            )
          }
        />
      </Box>
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
              const subtitle = getItemSubtitle(item);
              const bulletsShown = item.bullets.filter(
                (b) => selection?.bullets?.[b.id]?.isVisible !== false
              ).length;
              return (
                <SortableRow key={item.id} id={item.id}>
                  {(handle) => (
                    <Box data-testid="job-content-item">
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: COLUMNS,
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
                        <Checkbox
                          size="small"
                          checked={isShown}
                          slotProps={{
                            input: { "aria-label": `Show ${label}` },
                          }}
                          onChange={(event) =>
                            dispatch(
                              setItemSelection({
                                jobId: variant.id,
                                itemId: item.id,
                                change: { isVisible: event.target.checked },
                              })
                            )
                          }
                        />
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            minWidth: 0,
                          }}
                        >
                          {item.bullets.length > 0 && (
                            <IconButton
                              size="small"
                              aria-expanded={isOpen}
                              aria-label={`${isOpen ? "Collapse" : "Expand"} ${label}`}
                              onClick={() => toggleOpen(item.id)}
                            >
                              <ExpandMoreIcon
                                fontSize="small"
                                sx={{
                                  transform: isOpen ? "none" : "rotate(-90deg)",
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
                            {subtitle && (
                              <Typography
                                noWrap
                                sx={{
                                  fontSize: 12,
                                  color: WORKSPACE_COLORS.muted,
                                }}
                              >
                                {subtitle}
                              </Typography>
                            )}
                          </Box>
                          {item.bullets.length > 0 && (
                            <Typography
                              sx={{
                                flex: "none",
                                ml: 1,
                                fontSize: 12,
                                color: WORKSPACE_COLORS.muted,
                              }}
                            >
                              {bulletsShown} of {item.bullets.length}
                            </Typography>
                          )}
                        </Box>
                        <span />
                        <Button
                          size="small"
                          variant={isHighlighted ? "contained" : "outlined"}
                          color={isHighlighted ? "primary" : "inherit"}
                          aria-pressed={isHighlighted}
                          startIcon={
                            isHighlighted ? (
                              <StarIcon />
                            ) : (
                              <StarBorderOutlinedIcon />
                            )
                          }
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
                          sx={{ height: 34, width: 104 }}
                        >
                          Highlight
                        </Button>
                        <SortingIcons
                          index={index}
                          swapFunction={(_from, toIndex) =>
                            moveItem(item.id, toIndex)
                          }
                          isLastEntity={index === items.length - 1}
                        />
                      </Box>
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
export function JobContent(): JSX.Element {
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
      <Box sx={{ px: 2.5, py: 1.75, display: "flex", gap: 1.5 }}>
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
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: COLUMNS,
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
        <span>Entry</span>
        <span>Wording</span>
        <span>Highlight</span>
        <span />
      </Box>
      {sections.map((section) => (
        <SectionRows
          key={section.id}
          section={section}
          isOn={!hidden.includes(section.id)}
        />
      ))}
    </Box>
  );
}

import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import {
  Box,
  Checkbox,
  Chip,
  FormControlLabel,
  IconButton,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Wording } from "@custom-types/variant-types";
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
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  activeVariantSelector,
  setBulletOrders,
  setBulletSelection,
  setItemOrders,
  setItemSelection,
} from "@store/variants/variants-slice";

const WORDING_LABELS: Record<Wording, string> = {
  text: "Original",
  short: "Short",
  long: "Long",
  formal: "Formal",
};

const DRAG_START_DISTANCE_PX = 5;
const DRAGGED_OPACITY = 0.6;

function availableWordings(item: Item, bulletId: string): Wording[] {
  const alt = item.bullets.find((b) => b.id === bulletId)?.alt;
  return [
    "text",
    ...(["short", "long", "formal"] as const).filter((key) => alt?.[key]),
  ];
}

/** Where a drag ended, as the new index of the dragged id (or null if it did not move) */
export function getDropIndex(
  ids: string[],
  event: DragEndEvent
): number | null {
  const { active, over } = event;
  if (!over || active.id === over.id) {
    return null;
  }
  const index = ids.indexOf(String(over.id));
  return index < 0 ? null : index;
}

export function useReorderSensors(): ReturnType<typeof useSensors> {
  return useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: DRAG_START_DISTANCE_PX },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
}

interface RowProps {
  id: string;
  children: (handle: JSX.Element) => React.ReactNode;
}

/** A row that can be dragged by its handle, or moved with the keyboard when the handle has focus */
export function SortableRow({ id, children }: RowProps): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const handle = (
    <IconButton
      size="small"
      ref={setActivatorNodeRef}
      aria-label="Drag to reorder"
      sx={{ cursor: "grab", touchAction: "none" }}
      {...attributes}
      {...listeners}
    >
      <DragIndicatorIcon fontSize="small" />
    </IconButton>
  );

  return (
    <Box
      ref={setNodeRef}
      sx={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? DRAGGED_OPACITY : 1,
        backgroundColor: isDragging
          ? WORKSPACE_COLORS.accentSoft
          : "transparent",
      }}
    >
      {children(handle)}
    </Box>
  );
}

interface BulletsProps {
  item: Item;

  /** Draw each bullet as a card (the workspace inspector) instead of a compact row */
  isCard?: boolean;
}

const CARD_WORDINGS: { key: Wording; label: string }[] = [
  { key: "text", label: "Canon." },
  { key: "short", label: "Short" },
  { key: "long", label: "Long" },
  { key: "formal", label: "Formal" },
];

/** The bullets of one item: show/hide, wording, order */
export function ItemBullets({ item, isCard }: BulletsProps): JSX.Element {
  const dispatch = useAppDispatch();
  const variant = useAppSelector(activeVariantSelector);
  const sensors = useReorderSensors();
  const bullets = sortBulletsByVariant(item, variant.selection);
  const ids = bullets.map((b) => b.id);

  function moveBullet(bulletId: string, toIndex: number): void {
    dispatch(
      setBulletOrders({
        variantId: variant.id,
        itemId: item.id,
        orders: computeBulletOrders(item, variant, bulletId, toIndex),
      })
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={(event) => {
        const index = getDropIndex(ids, event);
        if (index !== null) {
          moveBullet(String(event.active.id), index);
        }
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {bullets.map((bullet, index) => {
          const choice = variant.selection[item.id]?.bullets?.[bullet.id];
          const wordings = availableWordings(item, bullet.id);
          const isShown = choice?.isVisible !== false;
          if (isCard) {
            return (
              <SortableRow key={bullet.id} id={bullet.id}>
                {(handle) => (
                  <Box
                    sx={{
                      border: `1px solid ${WORKSPACE_COLORS.border}`,
                      borderRadius: 1.5,
                      mb: 1,
                      bgcolor: isShown
                        ? WORKSPACE_COLORS.panel
                        : WORKSPACE_COLORS.panelAlt,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 0.25,
                        p: 0.75,
                      }}
                    >
                      {handle}
                      <IconButton
                        size="small"
                        aria-label={`${isShown ? "Hide" : "Show"} bullet: ${shorten(bullet.text)}`}
                        aria-pressed={isShown}
                        onClick={() =>
                          dispatch(
                            setBulletSelection({
                              variantId: variant.id,
                              itemId: item.id,
                              bulletId: bullet.id,
                              change: { isVisible: !isShown },
                            })
                          )
                        }
                      >
                        {isShown ? (
                          <VisibilityIcon fontSize="inherit" />
                        ) : (
                          <VisibilityOffIcon fontSize="inherit" />
                        )}
                      </IconButton>
                      <Typography
                        sx={{
                          flex: 1,
                          fontSize: 12.5,
                          lineHeight: 1.4,
                          pt: 0.5,
                          color: isShown ? undefined : WORKSPACE_COLORS.muted,
                        }}
                      >
                        {bullet.text}
                      </Typography>
                      <SortingIcons
                        index={index}
                        swapFunction={(_from, toIndex) =>
                          moveBullet(bullet.id, toIndex)
                        }
                        isLastEntity={index === bullets.length - 1}
                      />
                    </Box>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
                        px: 1,
                        pb: 1,
                        pl: 6,
                      }}
                    >
                      {bullet.tags.slice(0, 2).map((tag) => (
                        <Chip key={tag} size="small" label={tag} />
                      ))}
                      <Box sx={{ flex: 1 }} />
                      <ToggleButtonGroup
                        exclusive
                        size="small"
                        aria-label="Wording"
                        value={choice?.wording ?? "text"}
                        onChange={(_event, value: Wording | null) => {
                          if (value) {
                            dispatch(
                              setBulletSelection({
                                variantId: variant.id,
                                itemId: item.id,
                                bulletId: bullet.id,
                                change: { wording: value },
                              })
                            );
                          }
                        }}
                      >
                        {CARD_WORDINGS.filter(
                          (w) =>
                            w.key !== "formal" || wordings.includes("formal")
                        ).map((w) => (
                          <ToggleButton
                            key={w.key}
                            value={w.key}
                            disabled={!wordings.includes(w.key)}
                            sx={{ py: 0, px: 0.75, fontSize: 11.5, height: 22 }}
                          >
                            {w.label}
                          </ToggleButton>
                        ))}
                      </ToggleButtonGroup>
                    </Box>
                  </Box>
                )}
              </SortableRow>
            );
          }
          return (
            <SortableRow key={bullet.id} id={bullet.id}>
              {(handle) => (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    pl: 6,
                  }}
                >
                  {handle}
                  <SortingIcons
                    index={index}
                    swapFunction={(_from, toIndex) =>
                      moveBullet(bullet.id, toIndex)
                    }
                    isLastEntity={index === bullets.length - 1}
                  />
                  <FormControlLabel
                    sx={{ flexGrow: 1 }}
                    label={shorten(bullet.text)}
                    control={
                      <Checkbox
                        size="small"
                        checked={choice?.isVisible !== false}
                        onChange={(event) =>
                          dispatch(
                            setBulletSelection({
                              variantId: variant.id,
                              itemId: item.id,
                              bulletId: bullet.id,
                              change: { isVisible: event.target.checked },
                            })
                          )
                        }
                      />
                    }
                  />
                  {wordings.length > 1 && (
                    <TextField
                      select
                      size="small"
                      label="Wording"
                      value={choice?.wording ?? "text"}
                      onChange={(event) =>
                        dispatch(
                          setBulletSelection({
                            variantId: variant.id,
                            itemId: item.id,
                            bulletId: bullet.id,
                            change: { wording: event.target.value as Wording },
                          })
                        )
                      }
                      sx={{ minWidth: 120 }}
                    >
                      {wordings.map((w) => (
                        <MenuItem key={w} value={w}>
                          {WORDING_LABELS[w]}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                </Box>
              )}
            </SortableRow>
          );
        })}
      </SortableContext>
    </DndContext>
  );
}

interface Props {
  section: Section;
}

/** The items of one section for the active variant: show/hide, highlight, order, and their bullets */
export function VariantSectionItems({ section }: Props): JSX.Element | null {
  const dispatch = useAppDispatch();
  const variant = useAppSelector(activeVariantSelector);
  const sensors = useReorderSensors();
  const items = sortItemsByVariant(section.items, variant.selection);
  const ids = items.map((i) => i.id);

  if (items.length === 0) {
    return null;
  }

  function moveItem(itemId: string, toIndex: number): void {
    dispatch(
      setItemOrders({
        variantId: variant.id,
        orders: computeItemOrders(section.items, variant, itemId, toIndex),
      })
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: "bold",
        }}
      >
        {section.title}
      </Typography>
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
            const isVisible = selection?.isVisible !== false;
            return (
              <SortableRow key={item.id} id={item.id}>
                {(handle) => (
                  <Box sx={{ mt: 1 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {handle}
                      <SortingIcons
                        index={index}
                        swapFunction={(_from, toIndex) =>
                          moveItem(item.id, toIndex)
                        }
                        isLastEntity={index === items.length - 1}
                      />
                      <FormControlLabel
                        sx={{ flexGrow: 1 }}
                        label={getItemLabel(item)}
                        control={
                          <Checkbox
                            checked={isVisible}
                            onChange={(event) =>
                              dispatch(
                                setItemSelection({
                                  variantId: variant.id,
                                  itemId: item.id,
                                  change: { isVisible: event.target.checked },
                                })
                              )
                            }
                          />
                        }
                      />
                      <FormControlLabel
                        label="Highlight"
                        control={
                          <Checkbox
                            size="small"
                            checked={selection?.emphasis === "high"}
                            onChange={(event) =>
                              dispatch(
                                setItemSelection({
                                  variantId: variant.id,
                                  itemId: item.id,
                                  change: {
                                    emphasis: event.target.checked
                                      ? "high"
                                      : "normal",
                                  },
                                })
                              )
                            }
                          />
                        }
                      />
                    </Box>
                    {isVisible && <ItemBullets item={item} />}
                  </Box>
                )}
              </SortableRow>
            );
          })}
        </SortableContext>
      </DndContext>
    </Box>
  );
}

import {
  Box,
  Checkbox,
  FormControlLabel,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
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

function useReorderSensors(): ReturnType<typeof useSensors> {
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
function SortableRow({ id, children }: RowProps): JSX.Element {
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
        backgroundColor: isDragging ? "#e3f2fd" : "transparent",
      }}
    >
      {children(handle)}
    </Box>
  );
}

interface BulletsProps {
  item: Item;
}

/** The bullets of one item: show/hide, wording, order */
function ItemBullets({ item }: BulletsProps): JSX.Element {
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
          return (
            <SortableRow key={bullet.id} id={bullet.id}>
              {(handle) => (
                <Box display="flex" alignItems="center" gap={1} sx={{ pl: 6 }}>
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
      <Typography variant="subtitle1" fontWeight="bold">
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
                    <Box display="flex" alignItems="center">
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

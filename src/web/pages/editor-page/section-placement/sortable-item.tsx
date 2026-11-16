import {
  Box,
  ButtonBase,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from "@components/ui";
import {
  ArrowDownwardOutlined as ArrowDownwardIcon,
  ArrowUpwardOutlined as ArrowUpwardIcon,
  DeleteOutlined as DeleteOutlineIcon,
  DragIndicatorOutlined as DragIndicatorIcon,
} from "@components/ui/icons";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Side } from "@custom-types/styles-types";
import {
  moveToColumn,
  moveWithinColumn,
} from "@pages/editor-page/section-placement/section-placement-utils";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { appSelector, updatePageStructure } from "@store/app/app-slice";
import { getPreviewPartLabel } from "@store/vault/section-labels";
import { sectionsSelector } from "@store/vault/vault-slice";
import { activeVariantSelector, setSectionShown } from "@store/jobs/jobs-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { PreviewSectionId } from "@store/app/app-slice-types";
import { HEADER_IDS } from "@shared/vault/default-vault";

interface Props {
  /** The part to display in the sortable column */
  itemId: PreviewSectionId;

  /** The column it sits in */
  side: Side;

  /** Whether the CV has more than one column (then the area can be chosen) */
  hasColumns: boolean;

  /**
   * Template mode (Templates > Sections): the row is a short, selectable one (drag handle and
   * name); moving between areas, the arrows and the bin are in the properties header instead.
   */
  selection?: { isSelected: boolean; onSelect: () => void };
}

/** Icon buttons are 44px on touch sizes and keep their small size from a desktop up */
const TOUCH_BUTTON_SX = { p: { xs: "11px", lg: "5px" } } as const;

const AREA_LABELS: Record<Side, string> = {
  fullWidth: "Full width",
  left: "Left",
  right: "Right",
};

/**
 * One part of the page in a column: drag handle, include box (sections only; the header
 * always stays), name, area and up/down buttons (the keyboard way to reorder).
 */
export function SortableItem({
  itemId,
  side,
  hasColumns,
  selection,
}: Props): JSX.Element {
  const dispatch = useAppDispatch();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: itemId });
  const sections = useAppSelector(sectionsSelector);
  const { structure } = useAppSelector(appSelector);
  const variant = useAppSelector(activeVariantSelector);
  const isHeader = (HEADER_IDS as readonly string[]).includes(itemId);
  const removed = variant.hiddenSections ?? [];
  const isVisible = (id: string): boolean => !removed.includes(id);
  const name = getPreviewPartLabel(itemId, sections);
  const column = structure[side].filter(isVisible);
  const index = column.indexOf(itemId);

  /** One step among the sections still shown (removed ones sit in the column but are skipped) */
  function move(delta: -1 | 1): void {
    const full = structure[side];
    const from = full.indexOf(itemId);
    let to = from + delta;
    while (to >= 0 && to < full.length && !isVisible(full[to])) {
      to += delta;
    }
    let next = structure;
    for (let step = 0; step < Math.abs(to - from); step += 1) {
      next = moveWithinColumn(next, itemId, delta);
    }
    dispatch(updatePageStructure(next));
  }

  return (
    <Box
      ref={setNodeRef}
      role="listitem"
      sx={{
        transform: CSS.Transform.toString(transform),
        transition,
        display: "flex",
        alignItems: "center",
        flexWrap: { xs: "wrap", lg: "nowrap" },
        gap: 0.5,
        minHeight: 48,
        pl: 0.5,
        pr: 0.5,
        my: 0.5,
        border: `1px solid ${WORKSPACE_COLORS.borderStrong}`,
        borderRadius: 1,
        bgcolor:
          isDragging || selection?.isSelected
            ? WORKSPACE_COLORS.accentSoft
            : WORKSPACE_COLORS.panel,
        ...(selection?.isSelected
          ? { borderColor: WORKSPACE_COLORS.accent }
          : {}),
      }}
    >
      <IconButton
        size="small"
        ref={setActivatorNodeRef}
        aria-label={`Drag ${name} to reorder`}
        sx={{ cursor: "grab", touchAction: "none", ...TOUCH_BUTTON_SX }}
        {...attributes}
        {...listeners}
      >
        <DragIndicatorIcon fontSize="small" />
      </IconButton>
      {selection ? (
        <ButtonBase
          onClick={selection.onSelect}
          aria-current={selection.isSelected ? "true" : undefined}
          aria-label={`Edit ${name}`}
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 44,
            justifyContent: "flex-start",
            textAlign: "left",
            pl: 1,
            fontWeight: selection.isSelected ? 700 : 500,
            fontSize: 14,
            color: WORKSPACE_COLORS.text,
          }}
        >
          <Typography
            noWrap
            sx={{ fontSize: "inherit", fontWeight: "inherit" }}
          >
            {name}
          </Typography>
        </ButtonBase>
      ) : (
        <Typography
          noWrap
          sx={{
            flex: { xs: "1 1 120px", lg: 1 },
            minWidth: 0,
            fontWeight: 500,
            fontSize: 14,
            color: WORKSPACE_COLORS.text,
            pl: 1,
          }}
        >
          {name}
        </Typography>
      )}
      {selection
        ? null
        : hasColumns &&
          !isHeader && (
            <TextField
              select
              size="small"
              value={side}
              slotProps={{ htmlInput: { "aria-label": `Area for ${name}` } }}
              onChange={(event) =>
                dispatch(
                  updatePageStructure(
                    moveToColumn(structure, itemId, event.target.value as Side)
                  )
                )
              }
              sx={{
                width: 118,
                ml: { xs: 6.5, lg: 0 },
                order: { xs: 1, lg: 0 },
              }}
            >
              {(Object.keys(AREA_LABELS) as Side[]).map((key) => (
                <MenuItem key={key} value={key}>
                  {AREA_LABELS[key]}
                </MenuItem>
              ))}
            </TextField>
          )}
      {selection ? null : (
        <IconButton
          size="small"
          aria-label={`Move ${name} up`}
          disabled={index <= 0}
          sx={TOUCH_BUTTON_SX}
          onClick={() => move(-1)}
        >
          <ArrowUpwardIcon fontSize="small" />
        </IconButton>
      )}
      {selection ? null : (
        <IconButton
          size="small"
          aria-label={`Move ${name} down`}
          disabled={index < 0 || index === column.length - 1}
          sx={TOUCH_BUTTON_SX}
          onClick={() => move(1)}
        >
          <ArrowDownwardIcon fontSize="small" />
        </IconButton>
      )}
      {selection
        ? null
        : !isHeader && (
            <IconButton
              size="small"
              aria-label={`Remove ${name} from this job`}
              title="Remove from this job (your vault keeps it)"
              sx={TOUCH_BUTTON_SX}
              onClick={() =>
                dispatch(
                  setSectionShown({
                    jobId: variant.id,
                    sectionId: itemId,
                    isShown: false,
                  })
                )
              }
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          )}
    </Box>
  );
}

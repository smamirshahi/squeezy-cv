import {
  Box,
  Checkbox,
  Chip,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
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
}

const AREA_LABELS: Record<Side, string> = {
  fullWidth: "Full width",
  left: "Left",
  right: "Right",
};

/**
 * One part of the page in a column: drag handle, include box (sections only; the header
 * always stays), name, area and up/down buttons (the keyboard way to reorder).
 */
export function SortableItem({ itemId, side, hasColumns }: Props): JSX.Element {
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
  const isIncluded = !variant.hiddenSections?.includes(itemId);
  const name = getPreviewPartLabel(itemId, sections);
  const column = structure[side];
  const index = column.indexOf(itemId);

  return (
    <Box
      ref={setNodeRef}
      role="listitem"
      sx={{
        transform: CSS.Transform.toString(transform),
        transition,
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        minHeight: 48,
        pl: 0.5,
        pr: 0.5,
        my: 0.5,
        border: `1px solid ${WORKSPACE_COLORS.borderStrong}`,
        borderRadius: 1,
        bgcolor: isDragging
          ? WORKSPACE_COLORS.accentSoft
          : WORKSPACE_COLORS.panel,
      }}
    >
      <IconButton
        size="small"
        ref={setActivatorNodeRef}
        aria-label={`Drag ${name} to reorder`}
        sx={{ cursor: "grab", touchAction: "none" }}
        {...attributes}
        {...listeners}
      >
        <DragIndicatorIcon fontSize="small" />
      </IconButton>
      {!isHeader && (
        <Checkbox
          size="small"
          checked={isIncluded}
          slotProps={{ input: { "aria-label": `Include ${name} in this job` } }}
          onChange={(event) =>
            dispatch(
              setSectionShown({
                jobId: variant.id,
                sectionId: itemId,
                isShown: event.target.checked,
              })
            )
          }
        />
      )}
      <Typography
        noWrap
        sx={{
          flex: 1,
          minWidth: 0,
          fontWeight: 500,
          fontSize: 14,
          color: isIncluded ? WORKSPACE_COLORS.text : WORKSPACE_COLORS.muted,
          pl: isHeader ? 1 : 0,
        }}
      >
        {name}
      </Typography>
      {!isIncluded && <Chip size="small" label="Not included" />}
      {hasColumns && !isHeader && (
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
          sx={{ width: 118 }}
        >
          {(Object.keys(AREA_LABELS) as Side[]).map((key) => (
            <MenuItem key={key} value={key}>
              {AREA_LABELS[key]}
            </MenuItem>
          ))}
        </TextField>
      )}
      <IconButton
        size="small"
        aria-label={`Move ${name} up`}
        disabled={index <= 0}
        onClick={() =>
          dispatch(updatePageStructure(moveWithinColumn(structure, itemId, -1)))
        }
      >
        <ArrowUpwardIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        aria-label={`Move ${name} down`}
        disabled={index < 0 || index === column.length - 1}
        onClick={() =>
          dispatch(updatePageStructure(moveWithinColumn(structure, itemId, 1)))
        }
      >
        <ArrowDownwardIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { Side } from "@custom-types/styles-types";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Box, Typography } from "@mui/material";
import { SortableItem } from "@pages/editor-page/section-placement/sortable-item";
import { PreviewSectionId } from "@store/app/app-slice-types";

interface Props {
  title: string;

  /** Identifier for the column */
  side: Side;

  /** The items to display in the sortable column */
  itemIds: PreviewSectionId[];

  /** Short note next to the title, e.g. "above the columns" */
  hint?: string;

  /** Whether the CV has more than one column */
  hasColumns: boolean;
}

/** A column representing sortable items */
export function SortableColumn({
  title,
  side,
  itemIds,
  hint,
  hasColumns,
}: Props): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: side });

  return (
    <Box sx={{ flex: hasColumns ? "1 1 0" : "1 1 100%", minWidth: 0 }}>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mb: 0.75 }}>
        <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{title}</Typography>
        {hint && (
          <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
            {hint}
          </Typography>
        )}
      </Box>
      <SortableContext
        id={side}
        items={itemIds}
        strategy={verticalListSortingStrategy}
      >
        <Box
          ref={setNodeRef}
          role="list"
          aria-label={title}
          sx={{
            minHeight: 96,
            p: 1,
            border: `1.5px dashed ${WORKSPACE_COLORS.borderStrong}`,
            borderRadius: 1.5,
            bgcolor: isOver
              ? WORKSPACE_COLORS.accentSoft
              : WORKSPACE_COLORS.panelAlt,
          }}
        >
          {itemIds.length === 0 && (
            <Typography
              sx={{
                py: 3,
                textAlign: "center",
                fontSize: 12.5,
                color: WORKSPACE_COLORS.muted,
              }}
            >
              Drop a section here
            </Typography>
          )}
          {itemIds.map((id) => (
            <SortableItem
              key={id}
              itemId={id}
              side={side}
              hasColumns={hasColumns}
            />
          ))}
        </Box>
      </SortableContext>
    </Box>
  );
}

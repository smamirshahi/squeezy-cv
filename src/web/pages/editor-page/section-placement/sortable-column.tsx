import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { Side } from "@custom-types/styles-types";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Box, Typography } from "@mui/material";
import { SortableItem } from "@pages/editor-page/section-placement/sortable-item";
import { columnStyle } from "@pages/editor-page/section-placement/section-placement-utils";
import { PreviewSectionId } from "@store/app/app-slice-types";

interface Props {
  title: string;

  /** Identifier for the column */
  side: Side;

  /** The items to display in the sortable column */
  itemIds: PreviewSectionId[];
}

/** A column representing sortable items */
export function SortableColumn({ title, side, itemIds }: Props): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: side });

  return (
    <Box
      sx={{
        margin: "8px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Typography sx={{ fontWeight: "bold", fontSize: "16px" }}>
        {title}
      </Typography>
      <SortableContext
        id={side}
        items={itemIds}
        strategy={verticalListSortingStrategy}
      >
        <Box
          ref={setNodeRef}
          sx={{
            ...columnStyle,
            background: isOver
              ? WORKSPACE_COLORS.accentSoft
              : columnStyle.background,
          }}
        >
          {itemIds.map((id) => (
            <SortableItem key={id} itemId={id} />
          ))}
        </Box>
      </SortableContext>
    </Box>
  );
}

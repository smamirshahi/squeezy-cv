import { Side } from "@custom-types/styles-types";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Box } from "@mui/material";
import { SortableItem } from "@pages/editor-page/section-placement/sortable-item";
import { columnStyle } from "@pages/editor-page/section-placement/section-placement-utils";
import { PreviewSectionId } from "@store/app/app-slice-types";

interface Props {
  /** Identifier for the column */
  side: Side;

  /** The items to display in the sortable column */
  itemIds: PreviewSectionId[];
}

/** A column representing sortable items */
export function SortableColumn({ side, itemIds }: Props): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: side });

  return (
    <SortableContext
      id={side}
      items={itemIds}
      strategy={verticalListSortingStrategy}
    >
      <Box
        ref={setNodeRef}
        sx={{
          ...columnStyle,
          background: isOver ? "#e3f2fd" : columnStyle.background,
        }}
      >
        {itemIds.map((id) => (
          <SortableItem key={id} itemId={id} />
        ))}
      </Box>
    </SortableContext>
  );
}

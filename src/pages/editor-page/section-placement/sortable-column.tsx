import { Side } from "@custom-types/styles-types";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Box } from "@mui/material";
import { SortableItem } from "@pages/editor-page/section-placement/sortable-item";
import {
  Item,
  columnStyle,
} from "@pages/editor-page/section-placement/section-placement-utils";

interface Props {
  /** Identifier for the column */
  side: Side;

  /** The items to display in the sortable column */
  items: Item[];
}

/** A column representing sortable items */
export function SortableColumn({ side, items }: Props): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: side });

  return (
    <SortableContext
      id={side}
      items={items}
      strategy={verticalListSortingStrategy}
    >
      <Box
        ref={setNodeRef}
        sx={{
          ...columnStyle,
          background: isOver ? "#e3f2fd" : columnStyle.background,
        }}
      >
        {items.map((item) => (
          <SortableItem key={item.id} item={item} />
        ))}
      </Box>
    </SortableContext>
  );
}

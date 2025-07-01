import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Box } from "@mui/material";
import { SortableItem } from "@pages/editor-page/three-column/sortable-item";
import { Item } from "@pages/editor-page/three-column/three-column-draggable-utils";

interface Props {
  /** The items to display in the sortable column */
  items: Item[];
}

export function SortableColumn({ items }: Props): JSX.Element {
  return (
    <SortableContext items={items} strategy={verticalListSortingStrategy}>
      <Box
        sx={{
          background: "#f9f9f9",
          padding: "8px",
          border: "2px solid black",
          minHeight: "120px",
        }}
      >
        {items.map((item) => (
          <SortableItem key={item.id} item={item} />
        ))}
      </Box>
    </SortableContext>
  );
}

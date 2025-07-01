import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Box } from "@mui/material";
import { SortableItem } from "@pages/editor-page/three-column/sortable-item";
import { Item } from "@pages/editor-page/three-column/three-column-draggable-utils";

export function SortableColumn({ items }: { items: Item[] }): JSX.Element {
  return (
    <SortableContext items={items} strategy={verticalListSortingStrategy}>
      <Box
        sx={{
          background: "#f9f9f9",
          padding: "8px",
          border: "1px solid #ddd",
          minHeight: "120px",
        }}
      >
        {items.map((item) => (
          <SortableItem key={item.id} id={item.id} label={item.label} />
        ))}
      </Box>
    </SortableContext>
  );
}

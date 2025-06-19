import { Box } from "@mui/material";
import { Droppable } from "@components/drag-and-drop/droppable";
import {
  Container,
  GRID_SIZE,
  ItemsMap,
} from "@components/drag-and-drop/dnd-kit-wrapper-helper";
import { SortableItem } from "@components/drag-and-drop/sortable-item";

interface Props {
  side: "right" | "left";
  columns: Container[];
  itemsMap: ItemsMap;
}

export function SideDroppableArea({
  side,
  columns,
  itemsMap,
}: Props): JSX.Element {
  return (
    <Droppable id={side} userStyle={{ flex: 1 }}>
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        sx={{ paddingBottom: `${GRID_SIZE}px` }}
      >
        {columns.map((id) => {
          const el = itemsMap[id];
          if (!el) {
            return null;
          }
          return (
            <SortableItem key={id} id={id}>
              {el}
            </SortableItem>
          );
        })}
      </Box>
    </Droppable>
  );
}

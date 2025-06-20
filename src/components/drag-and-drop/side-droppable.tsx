import { Box } from "@mui/material";
import { Droppable } from "@components/drag-and-drop/droppable";
import { GRID_SIZE } from "@components/drag-and-drop/dnd-kit-wrapper-helper";
import { SortableItem } from "@components/drag-and-drop/sortable-item";
import {
  SectionId,
  SectionIdToContentMap,
} from "@components/drag-and-drop/dnd-kit-types";

interface Props {
  /** The side in which the content is placed */
  side: "right" | "left";

  /** The IDs of the sections */
  sectionIds: SectionId[];

  /** The map of section IDs to their content */
  sectionsMap: SectionIdToContentMap;
}

/** A droppable component showing in one side */
export function SideDroppableArea({
  side,
  sectionIds,
  sectionsMap,
}: Props): JSX.Element {
  return (
    <Droppable id={side} userStyle={{ flex: 1 }}>
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        sx={{ paddingBottom: `${GRID_SIZE}px` }}
      >
        {sectionIds.map((id) => {
          const content = sectionsMap[id];
          if (!content) {
            return null;
          }
          return (
            <SortableItem key={id} id={id}>
              {content}
            </SortableItem>
          );
        })}
      </Box>
    </Droppable>
  );
}

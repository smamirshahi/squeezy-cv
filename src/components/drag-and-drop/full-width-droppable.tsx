import { Box } from "@mui/material";
import { Droppable } from "@components/drag-and-drop/droppable";
import { GRID_SIZE } from "@components/drag-and-drop/dnd-kit-wrapper-helper";
import { SortableItem } from "@components/drag-and-drop/sortable-item";
import {
  SectionId,
  SectionIdToContentMap,
} from "@components/drag-and-drop/dnd-kit-types";

interface Props {
  /** The IDs of the sections */
  sectionIds: SectionId[];

  /** The map of section IDs to their content */
  sectionsMap: SectionIdToContentMap;
}

/** A droppable component in fullWidth */
export function FullWidthDroppable({
  sectionIds,
  sectionsMap,
}: Props): JSX.Element {
  return (
    <Droppable id="fullWidth" userStyle={{ width: "100%" }}>
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        sx={{ width: "100%", paddingBottom: `${GRID_SIZE}px` }}
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

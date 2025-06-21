import { Box } from "@mui/material";
import { Droppable } from "@components/drag-and-drop/droppable";
import { SortableSection } from "@components/drag-and-drop/sortable-section";
import {
  SectionId,
  SectionIdToContentMap,
} from "@components/drag-and-drop/dnd-kit-types";
import { GRID_SIZE_PX } from "@custom-styles/custom-styles";

interface Props {
  /** The IDs of the sections */
  sectionIds: SectionId[];

  /** The map of section IDs to their content */
  sectionsMap: SectionIdToContentMap;
}

/** A droppable component showing in one side */
export function SideDroppableArea({
  sectionIds,
  sectionsMap,
}: Props): JSX.Element {
  return (
    <Droppable id="side" userStyle={{ flex: 1 }}>
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        sx={{ paddingBottom: `${GRID_SIZE_PX}px` }}
      >
        {sectionIds.map((sectionId) => {
          const content = sectionsMap[sectionId];
          if (!content) {
            return null;
          }
          return (
            <SortableSection key={sectionId} sectionId={sectionId}>
              {content}
            </SortableSection>
          );
        })}
      </Box>
    </Droppable>
  );
}

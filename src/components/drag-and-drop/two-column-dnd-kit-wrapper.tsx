import { useEffect, useState } from "react";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import { A4_DIMENSION_MM } from "@custom-styles/custom-styles";
import { Box, Paper } from "@mui/material";
import {
  findContentSideById,
  GRID_SIZE,
  useDndKitWrapper,
} from "@components/drag-and-drop/dnd-kit-wrapper-helper";
import { useAppSelector } from "@store/store-helper";
import { appSelector } from "@store/app/app-slice";
import { useStyleHelper } from "@hooks/use-style-helper";
import { SideDroppableArea } from "@components/drag-and-drop/side-droppable";
import { FullWidthDroppable } from "@components/drag-and-drop/full-width-droppable";
import {
  SectionId,
  Side,
  SideToSectionIdMap,
} from "@components/drag-and-drop/dnd-kit-types";

interface Props {
  /** The reference to the content (the A4 paper container) */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

/** A simple two column DnD layout */
export function TwoColumnDnDKitWrapper({ contentRef }: Props): JSX.Element {
  const { shouldShowGrids } = useAppSelector(appSelector);
  const { paperMarginForPrinting } = useStyleHelper();
  const { availableSections, idToSectionMap, updatePaperContent } =
    useDndKitWrapper();
  const [sectionIdsBySide, setSectionIdsBySide] = useState<SideToSectionIdMap>(
    () => updatePaperContent()
  );

  // When availableSections change (e.g. after importing data), ensure sectionIdsBySide include all valid section IDs.
  // Only reset when new or removed sections are detected so manual arrangements persist across re-renders.
  useEffect(() => {
    const newAvailableIds = availableSections.map(({ id }) => id);
    const oldAvailableIds = [
      ...sectionIdsBySide.fullWidth,
      ...sectionIdsBySide.left,
      ...sectionIdsBySide.right,
    ];
    const hasDifference =
      newAvailableIds.length !== oldAvailableIds.length ||
      !newAvailableIds.every((id) => oldAvailableIds.includes(id));
    if (hasDifference) {
      setSectionIdsBySide(updatePaperContent());
    }
  }, [sectionIdsBySide, availableSections, updatePaperContent]);

  function arrayMove<T>(array: readonly T[], from: number, to: number): T[] {
    const newArray = array.slice();
    const [moved] = newArray.splice(from, 1);
    newArray.splice(to, 0, moved);
    return newArray;
  }

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event;
    if (!over) {
      return;
    }

    const activeContainer = findContentSideById(
      sectionIdsBySide,
      active.id as Side
    );
    const overContainer = findContentSideById(
      sectionIdsBySide,
      over.id as Side
    );
    if (!activeContainer || !overContainer) {
      return;
    }

    if (activeContainer === overContainer) {
      if (active.id !== over.id) {
        setSectionIdsBySide((prev) => ({
          ...prev,
          [activeContainer]: arrayMove(
            prev[activeContainer],
            prev[activeContainer].indexOf(active.id as SectionId),
            prev[activeContainer].indexOf(over.id as SectionId)
          ),
        }));
      }
      return;
    }

    setSectionIdsBySide((prev) => {
      const sourceItems = [...prev[activeContainer]];
      const targetItems = [...prev[overContainer]];
      sourceItems.splice(sourceItems.indexOf(active.id as SectionId), 1);
      const insertIndex =
        over.id === "left" || over.id === "right" || over.id === "fullWidth"
          ? targetItems.length
          : targetItems.indexOf(over.id as SectionId);
      targetItems.splice(insertIndex, 0, active.id as SectionId);

      return {
        ...prev,
        [activeContainer]: sourceItems,
        [overContainer]: targetItems,
      };
    });
  }

  return (
    <Paper
      ref={contentRef}
      elevation={3}
      sx={{
        width: `${A4_DIMENSION_MM.width}mm`,
        height: `${A4_DIMENSION_MM.height}mm`,
        overflow: "hidden",
        boxSizing: "border-box",
        mx: "auto",
        fontSize: "12pt",
        fontFamily: "Calibri, sans-serif",
        position: "relative",
        backgroundImage: shouldShowGrids
          ? "linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px)," +
            "linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px)"
          : "none",
        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        padding: paperMarginForPrinting,
        gap: 2,
      }}
    >
      <DndContext
        modifiers={[restrictToParentElement]}
        onDragEnd={handleDragEnd}
      >
        <FullWidthDroppable
          sectionIds={sectionIdsBySide.fullWidth}
          sectionsMap={idToSectionMap}
        />
        <Box display="flex" flexDirection="row" alignItems="flex-start" gap={2}>
          <SideDroppableArea
            sectionIds={sectionIdsBySide.left}
            sectionsMap={idToSectionMap}
          />
          <SideDroppableArea
            sectionIds={sectionIdsBySide.right}
            sectionsMap={idToSectionMap}
          />
        </Box>
      </DndContext>
    </Paper>
  );
}

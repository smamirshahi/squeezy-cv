import { useEffect, useState } from "react";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import { A4_DIMENSION_MM, GRID_SIZE_PX } from "@custom-styles/custom-styles";
import { Box, Paper } from "@mui/material";
import {
  findContentSideById,
  reorderSections,
  useDndKitWrapper,
} from "@components/drag-and-drop/dnd-kit-wrapper-helper";
import { useAppSelector } from "@store/store-helper";
import { appSelector } from "@store/app/app-slice";
import { useStyleHelper } from "@hooks/use-style-helper";
import { SideDroppableArea } from "@components/drag-and-drop/side-droppable";
import { FullWidthDroppable } from "@components/drag-and-drop/full-width-droppable";
import {
  SectionId,
  SideToSectionIdMap,
} from "@components/drag-and-drop/dnd-kit-types";
import { isIdSectionId } from "@custom-types/type-guards";

interface Props {
  /** The reference to the content (the A4 paper container) */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

/** A simple two column DnD layout */
export function TwoColumnDnDKitWrapper({ contentRef }: Props): JSX.Element {
  const { shouldShowGrids } = useAppSelector(appSelector);
  const { paperMarginForPrinting } = useStyleHelper();
  const { sectionsWithContent, idToSectionMap, updatePaperContent } =
    useDndKitWrapper();
  const [sectionIdsBySide, setSectionIdsBySide] = useState<SideToSectionIdMap>(
    () => updatePaperContent()
  );

  // When availableSections change (e.g. after importing data), ensure sectionIdsBySide include all valid section IDs.
  // Only reset when new or removed sections are detected so manual arrangements persist across re-renders.
  useEffect(() => {
    const newAvailableIds = sectionsWithContent.map(({ id }) => id);
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
  }, [sectionIdsBySide, sectionsWithContent, updatePaperContent]);

  // FIXME: The problem is that sectionIdsBySide doesn't change based on the changes with alignment
  /** Update content if a section has changed side */
  // useEffect(() => {
  //   setSectionIdsBySide(updatePaperContent());
  // }, [sectionIdsBySide, updatePaperContent]);

  /**
   * Handle the drag
   * It checks if the dragged section has changed side and update sectionsIdsBySide accordingly.
   */
  function handleDragEnd(event: DragEndEvent): void {
    // active is the item being dragged, over is the item being hovered over
    const { active, over } = event;

    // If over is null or either active or over is a SectionId, it means the drag is not valid
    // because we cannot drop a section on another section.
    if (!over || !isIdSectionId(active.id) || !isIdSectionId(over.id)) {
      return;
    }

    const activeContentSide = findContentSideById(sectionIdsBySide, active.id);
    const overContentSide = findContentSideById(sectionIdsBySide, over.id);
    if (!activeContentSide || !overContentSide) {
      return;
    }

    // If the active and over sections are on the same side, reorder them
    if (activeContentSide === overContentSide) {
      if (active.id !== over.id) {
        setSectionIdsBySide((prev) => ({
          ...prev,
          [activeContentSide]: reorderSections(
            prev[activeContentSide],
            prev[activeContentSide].indexOf(active.id as SectionId),
            prev[activeContentSide].indexOf(over.id as SectionId)
          ),
        }));
      }
      return;
    }

    // If the active and over sections are on different sides, move the active section to the over side
    setSectionIdsBySide((prev) => {
      const sourceItems = [...prev[activeContentSide]];
      const targetItems = [...prev[overContentSide]];
      sourceItems.splice(sourceItems.indexOf(active.id as SectionId), 1);
      const insertIndex =
        over.id === "left" || over.id === "right" || over.id === "fullWidth"
          ? targetItems.length
          : targetItems.indexOf(over.id as SectionId);
      targetItems.splice(insertIndex, 0, active.id as SectionId);

      return {
        ...prev,
        [activeContentSide]: sourceItems,
        [overContentSide]: targetItems,
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
        backgroundSize: `${GRID_SIZE_PX}px ${GRID_SIZE_PX}px`,
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

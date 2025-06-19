import { useEffect, useState } from "react";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import { A4_DIMENSION_MM } from "@custom-styles/custom-styles";
import { Box, Paper } from "@mui/material";
import {
  Column,
  Container,
  GRID_SIZE,
  useItems,
} from "@components/drag-and-drop/dnd-kit-wrapper-helper";
import { useAppSelector } from "@store/store-helper";
import { appSelector } from "@store/app/app-slice";
import { useStyleHelper } from "@hooks/use-style-helper";
import { SideDroppableArea } from "@components/drag-and-drop/side-droppable";
import { FullWidthDroppable } from "@components/drag-and-drop/full-width-droppable";

interface Props {
  /** The reference to the content (the A4 paper container) */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

/** A simple two column DnD layout */
export function TwoColumnDnDKitWrapper({ contentRef }: Props): JSX.Element {
  const { shouldShowGrids } = useAppSelector(appSelector);
  const { paperMarginForPrinting } = useStyleHelper();
  const { existedItems, itemsMap, containerBasedOnSide } = useItems();

  const [columns, setColumns] = useState(() => ({
    fullWidth: containerBasedOnSide("fullWidth"),
    left: containerBasedOnSide("left"),
    right: containerBasedOnSide("right"),
  }));

  // When validItems change (e.g. after importing data), ensure columns include
  // all valid IDs. Only reset when new or removed items are detected so manual
  // arrangements persist across re-renders.
  useEffect(() => {
    const validIds = existedItems.map(({ id }) => id);
    const columnIds = [...columns.fullWidth, ...columns.left, ...columns.right];
    const hasDifference =
      validIds.length !== columnIds.length ||
      !validIds.every((id) => columnIds.includes(id));
    if (hasDifference) {
      setColumns({
        fullWidth: containerBasedOnSide("fullWidth"),
        left: containerBasedOnSide("left"),
        right: containerBasedOnSide("right"),
      });
    }
  }, [columns, containerBasedOnSide, existedItems]);

  function findContainer(id: Column): Column | null {
    if (id === "fullWidth" || id === "left" || id === "right") {
      return id;
    }
    if (columns.left.includes(id)) {
      return "left";
    }
    if (columns.right.includes(id)) {
      return "right";
    }
    if (columns.fullWidth.includes(id)) {
      return "fullWidth";
    }
    return null;
  }

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

    const activeContainer = findContainer(active.id as Column);
    const overContainer = findContainer(over.id as Column);
    if (!activeContainer || !overContainer) {
      return;
    }

    if (activeContainer === overContainer) {
      if (active.id !== over.id) {
        setColumns((prev) => ({
          ...prev,
          [activeContainer]: arrayMove(
            prev[activeContainer],
            prev[activeContainer].indexOf(active.id as Container),
            prev[activeContainer].indexOf(over.id as Container)
          ),
        }));
      }
      return;
    }

    setColumns((prev) => {
      const sourceItems = [...prev[activeContainer]];
      const targetItems = [...prev[overContainer]];
      sourceItems.splice(sourceItems.indexOf(active.id as Container), 1);
      const insertIndex =
        over.id === "left" || over.id === "right" || over.id === "fullWidth"
          ? targetItems.length
          : targetItems.indexOf(over.id as Container);
      targetItems.splice(insertIndex, 0, active.id as Container);

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
        <FullWidthDroppable columns={columns.fullWidth} itemsMap={itemsMap} />
        <Box display="flex" flexDirection="row" alignItems="flex-start" gap={2}>
          <SideDroppableArea
            side="left"
            columns={columns.left}
            itemsMap={itemsMap}
          />
          <SideDroppableArea
            side="right"
            columns={columns.right}
            itemsMap={itemsMap}
          />
        </Box>
      </DndContext>
    </Paper>
  );
}

import { useEffect, useMemo, useState } from "react";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import { A4_DIMENSION_MM } from "@custom-styles/custom-styles";
import { Box, Paper } from "@mui/material";
import {
  GRID_SIZE,
  useItems,
} from "@components/drag-and-drop/dnd-kit-wrapper-helper";
import { SortableItem } from "@components/drag-and-drop/sortable-item";
import { Droppable } from "@components/drag-and-drop/droppable";
import { useAppSelector } from "@store/store-helper";
import { appSelector } from "@store/app/app-slice";
import { styleSelector } from "@store/cv-data/cv-data-slice";

interface Props {
  /** The reference to the content (the A4 paper container) */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

/** A simple two column DnD layout */
export function TwoColumnDnDKitWrapper({ contentRef }: Props): JSX.Element {
  const { shouldShowGrids } = useAppSelector(appSelector);
  const { paperMargin } = useAppSelector(styleSelector);
  const items = useItems();
  const validItems = items.filter((i) => i.element !== null);
  const itemsMap = useMemo(
    () => Object.fromEntries(validItems.map((i) => [i.id, i.element])),
    [validItems]
  );
  const [columns, setColumns] = useState(() => ({
    left: validItems.filter((i) => i.column === "left").map((i) => i.id),
    right: validItems.filter((i) => i.column === "right").map((i) => i.id),
  }));

  // When validItems change (e.g. after importing data), ensure columns include
  // all valid IDs. Only reset when new or removed items are detected so manual
  // arrangements persist across re-renders.
  useEffect(() => {
    const validIds = validItems.map((i) => i.id);
    const columnIds = [...columns.left, ...columns.right];
    const hasDifference =
      validIds.length !== columnIds.length ||
      !validIds.every((id) => columnIds.includes(id));
    if (hasDifference) {
      setColumns({
        left: validItems.filter((i) => i.column === "left").map((i) => i.id),
        right: validItems.filter((i) => i.column === "right").map((i) => i.id),
      });
    }
  }, [validItems, columns.left, columns.right]);

  function findContainer(id: string): "left" | "right" | null {
    if (id === "left" || id === "right") return id;
    if (columns.left.includes(id)) return "left";
    if (columns.right.includes(id)) return "right";
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

    const activeContainer = findContainer(active.id as string);
    const overContainer = findContainer(over.id as string);
    if (!activeContainer || !overContainer) {
      return;
    }

    if (activeContainer === overContainer) {
      if (active.id !== over.id) {
        setColumns((prev) => ({
          ...prev,
          [activeContainer]: arrayMove(
            prev[activeContainer],
            prev[activeContainer].indexOf(active.id as string),
            prev[activeContainer].indexOf(over.id as string)
          ),
        }));
      }
      return;
    }

    setColumns((prev) => {
      const sourceItems = [...prev[activeContainer]];
      const targetItems = [...prev[overContainer]];
      sourceItems.splice(sourceItems.indexOf(active.id as string), 1);
      const insertIndex =
        over.id === "left" || over.id === "right"
          ? targetItems.length
          : targetItems.indexOf(over.id as string);
      targetItems.splice(insertIndex, 0, active.id as string);

      return {
        ...prev,
        [activeContainer]: sourceItems,
        [overContainer]: targetItems,
      };
    });
  }

  const paperMarginForPrinting: string = useMemo(() => {
    switch (paperMargin) {
      case "narrow":
        return "48px";
      case "normal":
        return "96px";
    }
  }, [paperMargin]);

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
        flexDirection: "row",
        alignItems: "flex-start",
        padding: paperMarginForPrinting,
        gap: 2,
      }}
    >
      <DndContext
        modifiers={[restrictToParentElement]}
        onDragEnd={handleDragEnd}
      >
        <Droppable id="left" userStyle={{ flex: 1 }}>
          <Box display="flex" flexDirection="column" alignItems="center">
            {columns.left.map((id) => {
              const el = itemsMap[id];
              if (!el) return null;
              return (
                <SortableItem key={id} id={id}>
                  {el}
                </SortableItem>
              );
            })}
          </Box>
        </Droppable>
        <Droppable id="right" userStyle={{ flex: 1 }}>
          <Box display="flex" flexDirection="column" alignItems="center">
            {columns.right.map((id) => {
              const el = itemsMap[id];
              if (!el) return null;
              return (
                <SortableItem key={id} id={id}>
                  {el}
                </SortableItem>
              );
            })}
          </Box>
        </Droppable>
      </DndContext>
    </Paper>
  );
}

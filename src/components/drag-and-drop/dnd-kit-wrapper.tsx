import { useState } from "react";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import { A4_DIMENSION_MM } from "@custom-styles/custom-styles";
import { Paper } from "@mui/material";
import {
  GRID_SIZE,
  useItems,
} from "@components/drag-and-drop/dnd-kit-wrapper-helper";
import { SortableItem } from "@components/drag-and-drop/sortable-item";
import { useAppSelector } from "@store/store-helper";
import { appSelector } from "@store/app/app-slice";

interface Props {
  /** The reference to the content (the A4 paper container) */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

export function DnDKitWrapper({ contentRef }: Props): JSX.Element {
  const { shouldShowGrids } = useAppSelector(appSelector);
  const items = useItems();
  const [order, setOrder] = useState(items.map((item) => item.id));

  function arrayMove<T>(array: readonly T[], from: number, to: number): T[] {
    const newArray = array.slice();
    const [moved] = newArray.splice(from, 1);
    newArray.splice(to, 0, moved);
    return newArray;
  }

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setOrder((prev) => {
        const oldIndex = prev.indexOf(active.id as string);
        const newIndex = prev.indexOf(over.id as string);

        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }

  return (
    <Paper
      ref={contentRef}
      elevation={3}
      sx={{
        // Force the container to be exactly A4 (210 mm × 297 mm),
        // with “narrow” 12.7 mm padding on all sides.
        width: `${A4_DIMENSION_MM.width}mm`,
        height: `${A4_DIMENSION_MM.height}mm`,
        // Hide anything outside
        overflow: "hidden",
        boxSizing: "border-box",
        mx: "auto",
        fontSize: "12pt",
        fontFamily: "Calibri, sans-serif",
        // ensures children are clipped
        position: "relative",
        backgroundImage: shouldShowGrids
          ? "linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px)," +
            "linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px)"
          : "none",
        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <DndContext
        modifiers={[restrictToParentElement]}
        onDragEnd={handleDragEnd}
      >
        {order.map((id) => {
          const item = items.find((i) => i.id === id)!;
          if (item.element === null) {
            return;
          }
          return (
            <SortableItem key={id} id={id}>
              {item.element}
            </SortableItem>
          );
        })}
      </DndContext>
    </Paper>
  );
}

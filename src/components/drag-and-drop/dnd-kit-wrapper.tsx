import { useState } from "react";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import { Draggable } from "@components/drag-and-drop/draggable";
import { A4_DIMENSION_MM } from "@custom-styles/custom-styles";
import { Paper } from "@mui/material";
import {
  items,
  GRID_SIZE,
  snapToGrid,
} from "@components/drag-and-drop/dnd-kit-wrapper-helper";

interface Props {
  /** The reference to the content (the A4 paper container) */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

export function DnDKitWrapper({ contentRef }: Props): JSX.Element {
  const initialPositions = items.reduce<
    Record<string, { x: number; y: number }>
  >(
    (acc, item) => ({
      ...acc,
      [item.id]: item.position,
    }),
    {}
  );
  const [positions, setPositions] = useState(initialPositions);

  function handleDragEnd(event: DragEndEvent): void {
    const { active, delta } = event;

    setPositions((prev) => {
      const newX = prev[active.id].x + delta.x;
      const newY = prev[active.id].y + delta.y;

      return {
        ...prev,
        [active.id]: { x: snapToGrid(newX), y: snapToGrid(newY) },
      };
    });
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
        backgroundImage:
          "linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px)," +
          "linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px)",
        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
      }}
    >
      <DndContext
        modifiers={[restrictToParentElement]}
        onDragEnd={handleDragEnd}
      >
        {items.map((item) => (
          <Draggable
            key={item.id}
            id={item.id}
            userStyle={{
              position: "absolute",
              backgroundColor: "transparent",
              border: "2px dashed black",
              left: positions[item.id].x,
              top: positions[item.id].y,
              padding: "5px",
              margin: "0px",
              width: "100%",
            }}
          >
            {item.element}
          </Draggable>
        ))}
      </DndContext>
    </Paper>
  );
}

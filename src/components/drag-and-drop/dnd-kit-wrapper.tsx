import { useState } from "react";
import { DndContext, DragEndEvent, UniqueIdentifier } from "@dnd-kit/core";
import { Draggable } from "@components/drag-and-drop/draggable";
import { Droppable } from "@components/drag-and-drop/droppable";
import { A4_DIMENSION_MM } from "@custom-styles/custom-styles";
import { Paper } from "@mui/material";

interface Props {
  /** The reference to the content (the A4 paper container) */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

export function DnDKitWrapper({ contentRef }: Props): JSX.Element {
  const containers = ["A", "B", "C"];
  const [parent, setParent] = useState<UniqueIdentifier | null>(null);
  const draggableMarkup = <Draggable id="draggable">Drag me</Draggable>;

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
        // padding: `${marginsInMM}mm`,
        boxSizing: "border-box",
        mx: "auto",
        fontSize: "12pt",
        fontFamily: "Calibri, sans-serif",
        // ensures children are clipped
        position: "relative",
      }}
    >
      <DndContext onDragEnd={handleDragEnd}>
        {parent === null ? draggableMarkup : null}

        {containers.map((id) => (
          // We updated the Droppable component so it would accept an `id`
          // prop and pass it to `useDroppable`
          <Droppable key={id} id={id}>
            {parent === id ? draggableMarkup : "Drop here"}
          </Droppable>
        ))}
      </DndContext>
    </Paper>
  );

  function handleDragEnd(event: DragEndEvent): void {
    const { over } = event;

    // If the item is dropped over a container, set it as the parent
    // otherwise reset the parent to `null`
    setParent(over ? over.id : null);
  }
}

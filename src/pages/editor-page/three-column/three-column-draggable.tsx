import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { SortableColumn } from "@pages/editor-page/three-column/sortable-column";
import {
  findItemSideById,
  initialStructure,
  PageStructure,
} from "@pages/editor-page/three-column/three-column-draggable-utils";
import { Box } from "@mui/material";

export function ThreeColumnDraggable(): JSX.Element {
  const [pageStructure, setPageStructure] =
    useState<PageStructure>(initialStructure);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event;
    if (!over) {
      return;
    }

    const fromContainer = findItemSideById(pageStructure, active.id);
    const toContainer = findItemSideById(pageStructure, over.id);

    if (!fromContainer || !toContainer) {
      return;
    }

    const fromItems = [...pageStructure[fromContainer]];
    const toItems = [...pageStructure[toContainer]];

    const oldIndex = fromItems.findIndex(({ id }) => id === active.id);
    const newIndex = fromItems.findIndex(({ id }) => id === over.id);

    if (fromContainer === toContainer) {
      // Reorder within the same container
      const newItems = arrayMove(fromItems, oldIndex, newIndex);
      setPageStructure((prev) => ({ ...prev, [fromContainer]: newItems }));
    } else {
      // Move between containers
      const movingItem = oldIndex !== -1 ? fromItems[oldIndex] : undefined;
      if (!movingItem) {
        return;
      }

      const newFromItems = fromItems.filter(({ id }) => id !== active.id);
      const newToItems = [movingItem, ...toItems];

      setPageStructure((prev) => ({ ...prev, [fromContainer]: newFromItems }));
      setPageStructure((prev) => ({ ...prev, [toContainer]: newToItems }));
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        {/* Full-width Sortable */}

        <SortableColumn items={pageStructure.fullWidth} />
      </Box>

      <Box sx={{ display: "flex", justifyContent: "center" }}>
        {/* Left Column */}
        <SortableColumn items={pageStructure.left} />

        {/* Right Column */}
        <SortableColumn items={pageStructure.right} />
      </Box>
    </DndContext>
  );
}

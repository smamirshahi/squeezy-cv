import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { SortableColumn } from "@pages/editor-page/three-column/sortable-column";
import {
  findItemSideById,
  initialStructure,
  PageStructure,
} from "@pages/editor-page/three-column/three-column-draggable-utils";
import { Box } from "@mui/material";
import { Side } from "@custom-types/styles-types";

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

  function handleDragOver(event: DragOverEvent): void {
    const { active, over } = event;
    if (!over) {
      return;
    }

    const fromContainer = findItemSideById(pageStructure, active.id);
    const possibleSide = over.id as Side;
    const isContainer = ["fullWidth", "left", "right"].includes(possibleSide);
    const toContainer = isContainer
      ? possibleSide
      : findItemSideById(pageStructure, over.id);

    if (!fromContainer || !toContainer) {
      return;
    }

    if (fromContainer === toContainer) {
      const items = pageStructure[fromContainer];
      const oldIndex = items.findIndex(({ id }) => id === active.id);
      const newIndex = items.findIndex(({ id }) => id === over.id);
      if (oldIndex !== newIndex && newIndex !== -1) {
        setPageStructure((prev) => ({
          ...prev,
          [fromContainer]: arrayMove(prev[fromContainer], oldIndex, newIndex),
        }));
      }
      return;
    }

    setPageStructure((prev) => {
      const fromItems = [...prev[fromContainer]];
      const toItems = [...prev[toContainer]];
      const activeIndex = fromItems.findIndex(({ id }) => id === active.id);
      if (activeIndex === -1) {
        return prev;
      }
      const [movingItem] = fromItems.splice(activeIndex, 1);
      const overIndex = toItems.findIndex(({ id }) => id === over.id);
      const insertIndex = overIndex === -1 ? toItems.length : overIndex;
      toItems.splice(insertIndex, 0, movingItem);

      return {
        ...prev,
        [fromContainer]: fromItems,
        [toContainer]: toItems,
      };
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        {/* Full-width Sortable */}

        <SortableColumn side="fullWidth" items={pageStructure.fullWidth} />
      </Box>

      <Box sx={{ display: "flex", justifyContent: "center" }}>
        {/* Left Column */}
        <SortableColumn side="left" items={pageStructure.left} />

        {/* Right Column */}
        <SortableColumn side="right" items={pageStructure.right} />
      </Box>
    </DndContext>
  );
}

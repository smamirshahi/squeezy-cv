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
  initialStructure,
  PageStructure,
} from "@pages/editor-page/three-column/three-column-draggable-utils";
import { Side } from "@custom-types/styles-types";
import { Grid } from "@mui/material";

export function ThreeColumnDraggable(): JSX.Element {
  const [pageStructure, setPageStructure] =
    useState<PageStructure>(initialStructure);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  function findContainerSide(itemId: string): Side | null {
    if (pageStructure.fullWidth.find(({ id }) => id === itemId)) {
      return "fullWidth";
    }
    if (pageStructure.left.find(({ id }) => id === itemId)) {
      return "left";
    }
    if (pageStructure.right.find(({ id }) => id === itemId)) {
      return "right";
    }
    return null;
  }

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event;
    if (!over) {
      return;
    }

    const fromContainer = findContainerSide(active.id as string);
    const toContainer = findContainerSide(over.id as string);

    if (!fromContainer || !toContainer) {
      return;
    }

    if (fromContainer === toContainer) {
      // Reorder within the same container
      const items = [...pageStructure[fromContainer]];

      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      setPageStructure((prev) => ({ ...prev, [fromContainer]: newItems }));
    } else {
      // Move between containers
      const fromItems = [...pageStructure[fromContainer]];
      const toItems = [...pageStructure[toContainer]];

      const movingItem = fromItems.find(({ id }) => id === active.id);
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
      <Grid container spacing={2}>
        {/* Full-width Sortable */}
        <Grid size={12}>
          <SortableColumn items={pageStructure.fullWidth} />
        </Grid>

        {/* Left Column */}
        <Grid size={6}>
          <SortableColumn items={pageStructure.left} />
        </Grid>
        {/* Right Column */}
        <Grid size={6}>
          <SortableColumn items={pageStructure.right} />
        </Grid>
      </Grid>
    </DndContext>
  );
}

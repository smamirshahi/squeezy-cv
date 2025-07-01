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
  Item,
} from "@pages/editor-page/three-column/three-column-draggable-utils";
import { Side } from "@custom-types/styles-types";
import { Grid } from "@mui/material";

export function ThreeColumnDraggable(): JSX.Element {
  const [fullWidthItems, setFullWidthItems] = useState<Item[]>(
    initialStructure.fullWidth
  );
  const [leftItems, setLeftItems] = useState<Item[]>(initialStructure.left);
  const [rightItems, setRightItems] = useState<Item[]>(initialStructure.right);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  function findContainer(itemId: string): Side | null {
    if (fullWidthItems.find(({ id }) => id === itemId)) {
      return "fullWidth";
    }
    if (leftItems.find(({ id }) => id === itemId)) {
      return "left";
    }
    if (rightItems.find(({ id }) => id === itemId)) {
      return "right";
    }
    return null;
  }

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event;
    if (!over) {
      return;
    }

    const fromContainer = findContainer(active.id as string);
    const toContainer = findContainer(over.id as string);

    if (!fromContainer || !toContainer) {
      return;
    }

    if (fromContainer === toContainer) {
      // Reorder within the same container
      let items = [...fullWidthItems];
      if (fromContainer === "left") {
        items = [...leftItems];
      } else if (fromContainer === "right") {
        items = [...rightItems];
      }

      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);

      if (fromContainer === "fullWidth") {
        setFullWidthItems(newItems);
      } else if (fromContainer === "left") {
        setLeftItems(newItems);
      } else {
        setRightItems(newItems);
      }
    } else {
      // Move between containers
      let fromItems = [...fullWidthItems];
      if (fromContainer === "left") {
        fromItems = [...fullWidthItems];
      } else if (fromContainer === "right") {
        fromItems = [...rightItems];
      }

      let toItems = [...fullWidthItems];
      if (toContainer === "left") {
        toItems = [...leftItems];
      } else if (toContainer === "right") {
        toItems = [...rightItems];
      }

      const movingItem = fromItems.find(({ id }) => id === active.id);
      if (!movingItem) {
        return;
      }

      const newFromItems = fromItems.filter(({ id }) => id !== active.id);
      const newToItems = [movingItem, ...toItems];

      if (fromContainer === "fullWidth") {
        setFullWidthItems(newFromItems);
      } else if (fromContainer === "left") {
        setLeftItems(newFromItems);
      } else {
        setRightItems(newFromItems);
      }

      if (toContainer === "fullWidth") {
        setFullWidthItems(newToItems);
      } else if (toContainer === "left") {
        setLeftItems(newToItems);
      } else {
        setRightItems(newToItems);
      }
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
          <SortableColumn items={fullWidthItems} />
        </Grid>

        {/* Left Column */}
        <Grid size={6}>
          <SortableColumn items={leftItems} />
        </Grid>
        {/* Right Column */}
        <Grid size={6}>
          <SortableColumn items={rightItems} />
        </Grid>
      </Grid>
    </DndContext>
  );
}

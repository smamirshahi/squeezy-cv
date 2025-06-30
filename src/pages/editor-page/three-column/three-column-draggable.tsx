import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableColumn } from "@pages/editor-page/three-column/sortable-column";
import { Item } from "@pages/editor-page/three-column/three-column-draggable-utils";
import { Side } from "@custom-types/styles-types";

export function ThreeColumnDraggable(): JSX.Element {
  // State for each container
  const [fullWidthItems, setFullWidthItems] = useState<Item[]>([
    { id: "item-1", label: "Item 1" },
  ]);
  const [leftItems, setLeftItems] = useState<Item[]>([
    { id: "item-2", label: "Item 2" },
    { id: "item-3", label: "Item 3" },
  ]);
  const [rightItems, setRightItems] = useState<Item[]>([
    { id: "item-4", label: "Item 4" },
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  function findContainer(itemId: string): Side | null {
    if (fullWidthItems.find((i) => i.id === itemId)) {
      return "fullWidth";
    }
    if (leftItems.find((i) => i.id === itemId)) {
      return "left";
    }
    if (rightItems.find((i) => i.id === itemId)) {
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

      const movingItem = fromItems.find((i) => i.id === active.id);
      if (!movingItem) {
        return;
      }

      const newFromItems = fromItems.filter((i) => i.id !== active.id);
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "auto 1fr",
          gap: "16px",
        }}
      >
        {/* Full-width Sortable */}
        <SortableContext
          items={fullWidthItems}
          strategy={verticalListSortingStrategy}
        >
          <SortableColumn
            title=""
            items={fullWidthItems}
            gridColumn="1 / span 2"
          />
        </SortableContext>

        {/* Left Column */}
        <SortableContext
          items={leftItems}
          strategy={verticalListSortingStrategy}
        >
          <SortableColumn title="" items={leftItems} />
        </SortableContext>

        {/* Right Column */}
        <SortableContext
          items={rightItems}
          strategy={verticalListSortingStrategy}
        >
          <SortableColumn title="" items={rightItems} />
        </SortableContext>
      </div>
    </DndContext>
  );
}

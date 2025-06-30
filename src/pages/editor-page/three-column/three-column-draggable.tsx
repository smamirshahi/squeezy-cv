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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Item {
  id: string;
  label: string;
}

export function ThreeColumnDraggable(): JSX.Element {
  // State for each container
  const [topItems, setTopItems] = useState<Item[]>([
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

  function findContainer(itemId: string): "top" | "left" | "right" | null {
    if (topItems.find((i) => i.id === itemId)) {
      return "top";
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
      const items =
        fromContainer === "top"
          ? [...topItems]
          : fromContainer === "left"
            ? [...leftItems]
            : [...rightItems];

      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);

      if (fromContainer === "top") {
        setTopItems(newItems);
      } else if (fromContainer === "left") {
        setLeftItems(newItems);
      } else {
        setRightItems(newItems);
      }
    } else {
      // Move between containers
      const fromItems =
        fromContainer === "top"
          ? [...topItems]
          : fromContainer === "left"
            ? [...leftItems]
            : [...rightItems];

      const toItems =
        toContainer === "top"
          ? [...topItems]
          : toContainer === "left"
            ? [...leftItems]
            : [...rightItems];

      const movingItem = fromItems.find((i) => i.id === active.id);
      if (!movingItem) {
        return;
      }

      const newFromItems = fromItems.filter((i) => i.id !== active.id);
      const newToItems = [movingItem, ...toItems];

      if (fromContainer === "top") {
        setTopItems(newFromItems);
      } else if (fromContainer === "left") {
        setLeftItems(newFromItems);
      } else {
        setRightItems(newFromItems);
      }

      if (toContainer === "top") {
        setTopItems(newToItems);
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
        {/* Full-width Top Sortable */}
        <SortableContext
          items={topItems}
          strategy={verticalListSortingStrategy}
        >
          <Column title="" items={topItems} gridColumn="1 / span 2" />
        </SortableContext>

        {/* Left Column */}
        <SortableContext
          items={leftItems}
          strategy={verticalListSortingStrategy}
        >
          <Column title="" items={leftItems} />
        </SortableContext>

        {/* Right Column */}
        <SortableContext
          items={rightItems}
          strategy={verticalListSortingStrategy}
        >
          <Column title="" items={rightItems} />
        </SortableContext>
      </div>
    </DndContext>
  );
}

function Column({
  title,
  items,
  gridColumn,
}: {
  title: string;
  items: Item[];
  gridColumn?: string;
}): JSX.Element {
  return (
    <div
      style={{
        gridColumn,
        background: "#f9f9f9",
        padding: "8px",
        border: "1px solid #ddd",
        minHeight: "120px",
      }}
    >
      <h4>{title}</h4>
      {items.map((item) => (
        <SortableItem key={item.id} id={item.id} label={item.label} />
      ))}
    </div>
  );
}

function SortableItem({
  id,
  label,
}: {
  id: string;
  label: string;
}): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: "8px",
    margin: "4px 0",
    background: isDragging ? "#cce5ff" : "#fff",
    border: "1px solid #ccc",
    borderRadius: "4px",
    cursor: "grab",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {label}
    </div>
  );
}

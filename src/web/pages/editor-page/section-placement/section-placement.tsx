import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { SortableColumn } from "@pages/editor-page/section-placement/sortable-column";
import {
  moveBetweenColumns,
  reorderInColumn,
} from "@pages/editor-page/section-placement/section-placement-utils";
import { Box } from "@mui/material";
import { PageStructure } from "@store/app/app-slice-types";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { appSelector, updatePageStructure } from "@store/app/app-slice";

export function SectionPlacement(): JSX.Element {
  const dispatch = useAppDispatch();
  const { structure } = useAppSelector(appSelector);
  const [pageStructure, setPageStructure] = useState<PageStructure>(structure);

  // Follow the store, e.g. when a section was added, deleted or imported
  useEffect(() => {
    setPageStructure(structure);
  }, [structure]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    // Keyboard: focus a part, Space to pick it up, arrows to move, Space to drop
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // While dragging, a part already moves into the column it is over
  function handleDragOver(event: DragOverEvent): void {
    const { active, over } = event;
    if (over) {
      setPageStructure((current) =>
        moveBetweenColumns(current, active.id, over.id)
      );
    }
  }

  // On drop, settle the order inside the column and save it
  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event;
    if (!over) {
      setPageStructure(structure);
      return;
    }
    const next = reorderInColumn(pageStructure, active.id, over.id);
    setPageStructure(next);
    dispatch(updatePageStructure(next));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <Box sx={{ display: "flex", justifyContent: "center" }} gap={2}>
        <SortableColumn
          title="Full Width"
          side="fullWidth"
          itemIds={pageStructure.fullWidth}
        />
        <SortableColumn
          title="Left Side"
          side="left"
          itemIds={pageStructure.left}
        />
        <SortableColumn
          title="Right Side"
          side="right"
          itemIds={pageStructure.right}
        />
      </Box>
    </DndContext>
  );
}

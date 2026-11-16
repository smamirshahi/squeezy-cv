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
import { Box } from "@components/ui";
import { PageStructure } from "@store/app/app-slice-types";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { appSelector, updatePageStructure } from "@store/app/app-slice";
import { activeVariantSelector } from "@store/jobs/jobs-slice";

interface Props {
  /**
   * Template mode (Templates > Sections): every section of the template is listed (not only
   * the ones the active job shows) and a row can be selected.
   */
  selection?: { selectedId: string; onSelect: (id: string) => void };
}

export function SectionPlacement({ selection }: Props): JSX.Element {
  const dispatch = useAppDispatch();
  const { structure } = useAppSelector(appSelector);
  const [pageStructure, setPageStructure] = useState<PageStructure>(structure);
  const jobRemoved = useAppSelector(activeVariantSelector).hiddenSections ?? [];
  const removed = selection ? [] : jobRemoved;
  const shown = (ids: string[]): string[] =>
    ids.filter((id) => !removed.includes(id));
  const hasColumns = structure.left.length > 0 || structure.right.length > 0;

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
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
        {hasColumns ? (
          <>
            <Box sx={{ flex: "0 0 100%" }}>
              <SortableColumn
                title="Full width"
                hint="above the columns"
                side="fullWidth"
                itemIds={shown(pageStructure.fullWidth)}
                hasColumns
                selection={selection}
              />
            </Box>
            <SortableColumn
              title="Left column"
              side="left"
              itemIds={shown(pageStructure.left)}
              hasColumns
              selection={selection}
            />
            <SortableColumn
              title="Right column"
              side="right"
              itemIds={shown(pageStructure.right)}
              hasColumns
              selection={selection}
            />
          </>
        ) : (
          <SortableColumn
            title="Page"
            hint="sections stack from top to bottom"
            side="fullWidth"
            itemIds={shown(pageStructure.fullWidth)}
            hasColumns={false}
            selection={selection}
          />
        )}
      </Box>
    </DndContext>
  );
}

import { useSortable } from "@dnd-kit/sortable";
import {
  Item,
  getItemStyle,
} from "@pages/editor-page/three-column/three-column-draggable-utils";

interface Props {
  /** The items to display in the sortable column */
  item: Item;
}

export function SortableItem({ item }: Props): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = getItemStyle(transform, transition, isDragging);

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {item.label}
    </div>
  );
}

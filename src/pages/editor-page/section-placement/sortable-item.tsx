import { useSortable } from "@dnd-kit/sortable";
import {
  Item,
  getItemStyle,
} from "@pages/editor-page/section-placement/section-placement-utils";

interface Props {
  /** The items to display in the sortable column */
  item: Item;
}

/** Items in each dropdown column */
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

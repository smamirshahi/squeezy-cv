import { useSortable } from "@dnd-kit/sortable";
import { getItemStyle } from "@pages/editor-page/section-placement/section-placement-utils";
import { getPreviewPartLabel } from "@store/vault/section-labels";
import { sectionsSelector } from "@store/vault/vault-slice";
import { useAppSelector } from "@store/store-helper";
import { PreviewSectionId } from "@store/app/app-slice-types";

interface Props {
  /** The items to display in the sortable column */
  itemId: PreviewSectionId;
}

/** Items in each dropdown column */
export function SortableItem({ itemId }: Props): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: itemId });

  const sections = useAppSelector(sectionsSelector);
  const style = getItemStyle(transform, transition, isDragging);

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {getPreviewPartLabel(itemId, sections)}
    </div>
  );
}

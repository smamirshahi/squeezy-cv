import { SortableItem } from "@pages/editor-page/three-column/sortable-item";
import { Item } from "@pages/editor-page/three-column/three-column-draggable-utils";

export function SortableColumn({
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

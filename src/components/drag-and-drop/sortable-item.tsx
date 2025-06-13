import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { PropsWithChildren } from "react";

interface Props {
  /** Unique identifier */
  id: string;
}

/**
 * Wraps children with draggable and droppable behaviour so that items can be
 * reordered within a list.
 */
export function SortableItem({
  id,
  children,
}: PropsWithChildren<Props>): JSX.Element {
  const {
    setNodeRef: setDraggableRef,
    listeners,
    attributes,
    transform,
  } = useDraggable({ id });
  const { setNodeRef: setDroppableRef } = useDroppable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    backgroundColor: "transparent",
    border: "2px dashed black",
    padding: "5px",
    marginBottom: "10px",
    width: "100%",
  };

  return (
    <div
      ref={(node) => {
        setDraggableRef(node);
        setDroppableRef(node);
      }}
      style={style}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
}

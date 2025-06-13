import { useDraggable } from "@dnd-kit/core";
import { PropsWithChildren } from "react";

interface Props {
  /** Unique ID */
  id: string;
}

/** Adds the draggable functionality */
export function Draggable({
  id,
  children,
}: PropsWithChildren<Props>): JSX.Element {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
  });
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </div>
  );
}

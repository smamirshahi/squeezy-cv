import { useDraggable } from "@dnd-kit/core";
import { PropsWithChildren } from "react";

interface Props {
  /** Unique ID */
  id: string;
  /** Optional style to apply to the draggable element */
  style?: React.CSSProperties;
}

/** Adds the draggable functionality */
export function Draggable({
  id,
  children,
  style: userStyle,
}: PropsWithChildren<Props>): JSX.Element {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
  });
  const transformStyle = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : {};
  const style = { ...userStyle, ...transformStyle };

  return (
    <button ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </button>
  );
}

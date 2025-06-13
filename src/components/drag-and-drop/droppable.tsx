import { useDroppable } from "@dnd-kit/core";
import { PropsWithChildren } from "react";

interface Props {
  /** Unique ID */
  id: string;
  /** Optional style to apply to the container */
  userStyle?: React.CSSProperties;
}

/** Adds the droppable functionality */
export function Droppable({
  id,
  children,
  userStyle,
}: PropsWithChildren<Props>): JSX.Element {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });
  const style: React.CSSProperties = {
    color: isOver ? "green" : undefined,
    ...userStyle,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children}
    </div>
  );
}

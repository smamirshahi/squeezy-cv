import { useDroppable } from "@dnd-kit/core";
import { PropsWithChildren } from "react";

interface Props {
  /** Unique ID */
  id: string;
}

/** Adds the droppable functionality */
export function Droppable({
  id,
  children,
}: PropsWithChildren<Props>): JSX.Element {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });
  const style = {
    color: isOver ? "green" : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children}
    </div>
  );
}

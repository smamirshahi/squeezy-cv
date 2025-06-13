import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface Props {
  /** Unique identifier */
  id: string;
}

/** Wraps children with draggable and droppable behavior so that items can be reordered within a list. */
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
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id });

  const localRef = useRef<HTMLDivElement | null>(null);
  const [linePosition, setLinePosition] = useState<"top" | "bottom">("bottom");

  const handlePointerMove = useCallback((event: PointerEvent) => {
    const rect = localRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const midpoint = rect.top + rect.height / 2;
    setLinePosition(event.clientY < midpoint ? "top" : "bottom");
  }, []);

  useEffect(() => {
    if (!isOver) {
      return;
    }
    window.addEventListener("pointermove", handlePointerMove);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [isOver, handlePointerMove]);

  const indicatorStyle: React.CSSProperties = useMemo(() => {
    let borderTop = "2px dashed black";
    let borderBottom = "2px dashed black";
    if (isOver) {
      if (linePosition === "top") {
        borderTop = "2px solid blue";
      } else {
        borderBottom = "2px solid blue";
      }
    }
    return {
      borderTop,
      borderBottom,
    };
  }, [isOver, linePosition]);

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    backgroundColor: "transparent",
    padding: "5px",
    marginBottom: "20px",
    width: "100%",
    ...indicatorStyle,
  };

  return (
    <div
      ref={(node) => {
        setDraggableRef(node);
        setDroppableRef(node);
        localRef.current = node;
      }}
      style={style}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
}

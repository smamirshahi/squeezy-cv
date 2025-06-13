import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Box } from "@mui/material";
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

  return (
    <Box
      component="div"
      ref={(node: HTMLDivElement | null) => {
        setDraggableRef(node);
        setDroppableRef(node);
        localRef.current = node;
      }}
      sx={{
        transform: CSS.Translate.toString(transform),
        backgroundColor: "transparent",
        px: "5px",
        marginBottom: "10px",
        width: "95%",
        borderRight: "2px dashed black",
        borderLeft: "2px dashed black",
        ...indicatorStyle,
      }}
      {...listeners}
      {...attributes}
    >
      {children}
    </Box>
  );
}

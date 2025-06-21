import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Box } from "@mui/material";
import { appSelector } from "@store/app/app-slice";
import { useAppSelector } from "@store/store-helper";
import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DISTANCE_BETWEEN_SECTIONS_PX } from "@custom-styles/custom-styles";
import { PreviewSection } from "@components/preview-section";
import { SectionId } from "@components/drag-and-drop/dnd-kit-types";

interface Props {
  /** Unique identifier for the section used by dnd-kit */
  sectionId: SectionId;
}

/**
 * Wraps children with draggable and droppable behavior so that sections can be
 * reordered within a list. The component is used by the preview page so users
 * can drag sections like Education or Summary to a new position.
 */
export function SortableSection({
  sectionId,
  children,
}: PropsWithChildren<Props>): JSX.Element {
  const { shouldShowBorders } = useAppSelector(appSelector);

  const {
    setNodeRef: setDraggableRef,
    listeners,
    attributes,
    transform,
  } = useDraggable({ id: sectionId });

  // Register this section as a drop target so other sections can be placed here
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: sectionId,
  });

  // reference to the underlying DOM node for pointer calculations
  const localRef = useRef<HTMLDivElement | null>(null);

  // whether the placeholder line should be rendered above or below the section
  const [linePosition, setLinePosition] = useState<"top" | "bottom">("bottom");

  /** Sets the position of the placeholder line based on the hovering over the top or bottom half of the box */
  const handlePointerMove = useCallback((event: PointerEvent) => {
    const rect = localRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const midpoint = rect.top + rect.height / 2;
    setLinePosition(event.clientY < midpoint ? "top" : "bottom");
  }, []);

  // Only listen to pointer movement while another item is hovering over it.
  // This lets us show the appropriate indicator line position.
  useEffect(() => {
    if (!isOver) {
      return;
    }
    window.addEventListener("pointermove", handlePointerMove);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, [isOver, handlePointerMove]);

  /** Compute border styles that show a blue indicator when another item hovers above or below this section. */
  const indicatorStyle: React.CSSProperties = useMemo(() => {
    let borderTop = "2px double #6bda9a";
    let borderBottom = "2px double #6bda9a";
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
    <PreviewSection sectionId={sectionId}>
      <Box
        component="div"
        // Attach refs so this element participates in drag and drop
        ref={(node: HTMLDivElement | null) => {
          setDraggableRef(node);
          setDroppableRef(node);
          localRef.current = node;
        }}
        sx={{
          // Visual appearance and positioning while dragging
          transform: CSS.Translate.toString(transform),
          backgroundColor: "transparent",
          px: "5px",
          marginBottom: `${DISTANCE_BETWEEN_SECTIONS_PX}px`,
          width: "95%",
          borderRight: "2px double #6bda9a",
          borderLeft: "2px double #6bda9a",
          ...indicatorStyle,
          border: shouldShowBorders ? {} : "2px dashed transparent",
        }}
        {...listeners}
        {...attributes}
      >
        {children}
      </Box>
    </PreviewSection>
  );
}

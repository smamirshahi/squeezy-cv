import { useState } from "react";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import { Draggable } from "@components/drag-and-drop/draggable";
import { PersonalInfoPreviewPage } from "@pages/preview-page/personal-info-preview-page";
import { ContactInfoPreviewPage } from "@pages/preview-page/contact-info-preview-page";
import { A4_DIMENSION_MM } from "@custom-styles/custom-styles";
import { Paper } from "@mui/material";
import { SummaryPreviewPage } from "@pages/preview-page/summary-preview-page";
import { ExperiencesPreviewPage } from "@pages/preview-page/experiences-preview-page";
import { EducationsPreviewPage } from "@pages/preview-page/educations-preview-page";
import { SkillsPreviewPage } from "@pages/preview-page/skills-preview-page";

const GRID_SIZE = 20;

interface Props {
  /** The reference to the content (the A4 paper container) */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

export function DnDKitWrapper({ contentRef }: Props): JSX.Element {
  const items = [
    { id: "personalInfo", element: <PersonalInfoPreviewPage /> },
    { id: "contactInfo", element: <ContactInfoPreviewPage /> },
    { id: "summary", element: <SummaryPreviewPage /> },
    { id: "experiences", element: <ExperiencesPreviewPage /> },
    { id: "educations", element: <EducationsPreviewPage /> },
    { id: "skills", element: <SkillsPreviewPage /> },
  ] as const;
  const initialPositions = items.reduce<
    Record<string, { x: number; y: number }>
  >(
    (acc, item, index) => ({
      ...acc,
      [item.id]: { x: index * GRID_SIZE, y: 0 },
    }),
    {}
  );
  const [positions, setPositions] = useState(initialPositions);

  return (
    <Paper
      ref={contentRef}
      elevation={3}
      sx={{
        // Force the container to be exactly A4 (210 mm × 297 mm),
        // with “narrow” 12.7 mm padding on all sides.
        width: `${A4_DIMENSION_MM.width}mm`,
        height: `${A4_DIMENSION_MM.height}mm`,
        // Hide anything outside
        overflow: "hidden",
        boxSizing: "border-box",
        mx: "auto",
        fontSize: "12pt",
        fontFamily: "Calibri, sans-serif",
        // ensures children are clipped
        position: "relative",
        backgroundImage:
          "linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px)," +
          "linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px)",
        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
      }}
    >
      <DndContext
        modifiers={[restrictToParentElement]}
        onDragEnd={handleDragEnd}
      >
        {items.map((item) => (
          <Draggable
            key={item.id}
            id={item.id}
            userStyle={{
              position: "absolute",
              backgroundColor: "transparent",
              border: "2px dashed black",
              left: positions[item.id].x,
              top: positions[item.id].y,
            }}
          >
            {item.element}
          </Draggable>
        ))}
      </DndContext>
    </Paper>
  );

  function handleDragEnd(event: DragEndEvent): void {
    const { active, delta } = event;

    setPositions((prev) => {
      const newX = prev[active.id].x + delta.x;
      const newY = prev[active.id].y + delta.y;
      const snap = (n: number) => Math.round(n / GRID_SIZE) * GRID_SIZE;
      return {
        ...prev,
        [active.id]: { x: snap(newX), y: snap(newY) },
      };
    });
  }
}

import { useState } from "react";
import { DndContext, DragEndEvent, UniqueIdentifier } from "@dnd-kit/core";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import { Draggable } from "@components/drag-and-drop/draggable";
import { A4_DIMENSION_MM } from "@custom-styles/custom-styles";
import { Paper } from "@mui/material";
import { PersonalInfoPreviewPage } from "@pages/preview-page/personal-info-preview-page";
import { ContactInfoPreviewPage } from "@pages/preview-page/contact-info-preview-page";

interface Props {
  /** The reference to the content (the A4 paper container) */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

export function DnDKitWrapper({ contentRef }: Props): JSX.Element {
  const components = [
    { id: "personalInfo", component: <PersonalInfoPreviewPage /> },
    { id: "contactInfo", component: <ContactInfoPreviewPage /> },
  ];

  const initialPositions = components.reduce(
    (acc, { id }, index) => {
      acc[id] = { x: 0, y: index * 20 };
      return acc;
    },
    {} as Record<UniqueIdentifier, { x: number; y: number }>
  );

  const [positions, setPositions] =
    useState<Record<UniqueIdentifier, { x: number; y: number }>>(
      initialPositions
    );

  function handleDragEnd(event: DragEndEvent): void {
    const { delta, active } = event;
    setPositions((prev) => ({
      ...prev,
      [active.id]: {
        x: prev[active.id].x + delta.x,
        y: prev[active.id].y + delta.y,
      },
    }));
  }

  return (
    <Paper
      ref={contentRef}
      elevation={3}
      sx={{
        width: `${A4_DIMENSION_MM.width}mm`,
        height: `${A4_DIMENSION_MM.height}mm`,
        overflow: "hidden",
        boxSizing: "border-box",
        padding: "20mm",
        mx: "auto",
        fontSize: "12pt",
        fontFamily: "Calibri, sans-serif",
        position: "relative",
      }}
    >
      <DndContext
        onDragEnd={handleDragEnd}
        modifiers={[restrictToParentElement]}
      >
        {components.map(({ id, component }) => {
          const pos = positions[id];
          return (
            <Draggable key={id} id={id}>
              <div style={{ position: "absolute", left: pos.x, top: pos.y }}>
                {component}
              </div>
            </Draggable>
          );
        })}
      </DndContext>
    </Paper>
  );
}

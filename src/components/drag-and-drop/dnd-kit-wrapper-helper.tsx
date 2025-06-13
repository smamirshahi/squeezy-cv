import { ContactInfoPreviewPage } from "@pages/preview-page/contact-info-preview-page";
import { EducationsPreviewPage } from "@pages/preview-page/educations-preview-page";
import { ExperiencesPreviewPage } from "@pages/preview-page/experiences-preview-page";
import { PersonalInfoPreviewPage } from "@pages/preview-page/personal-info-preview-page";
import { SkillsPreviewPage } from "@pages/preview-page/skills-preview-page";
import { SummaryPreviewPage } from "@pages/preview-page/summary-preview-page";
import React, { useMemo } from "react";

export const GRID_SIZE = 20;

interface PreviewDnDComponents {
  id: string;
  element: React.ReactElement;
  position: { x: number; y: number };
}

export function useItems(): PreviewDnDComponents[] {
  const items = useMemo(() => {
    return [
      {
        id: "personalInfo",
        element: <PersonalInfoPreviewPage />,
        position: { x: 0, y: 0 },
      },
      {
        id: "contactInfo",
        element: <ContactInfoPreviewPage />,
        position: { x: 0, y: 80 },
      },
      {
        id: "summary",
        element: <SummaryPreviewPage />,
        position: { x: 0, y: 140 },
      },
      {
        id: "experiences",
        element: <ExperiencesPreviewPage />,
        position: { x: 0, y: 280 },
      },
      {
        id: "educations",
        element: <EducationsPreviewPage />,
        position: { x: 0, y: 760 },
      },
      {
        id: "skills",
        element: <SkillsPreviewPage />,
        position: { x: 0, y: 1000 },
      },
    ];
  }, []);

  return items;
}

/** Function to snap the moving component to grid */
export function snapToGrid(n: number): number {
  return Math.round(n / GRID_SIZE) * GRID_SIZE;
}

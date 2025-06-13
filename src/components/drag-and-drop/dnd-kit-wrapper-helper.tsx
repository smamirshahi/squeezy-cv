import { ContactInfoPreviewPage } from "@pages/preview-page/contact-info-preview-page";
import { EducationsPreviewPage } from "@pages/preview-page/educations-preview-page";
import { ExperiencesPreviewPage } from "@pages/preview-page/experiences-preview-page";
import { PersonalInfoPreviewPage } from "@pages/preview-page/personal-info-preview-page";
import { SkillsPreviewPage } from "@pages/preview-page/skills-preview-page";
import { SummaryPreviewPage } from "@pages/preview-page/summary-preview-page";
import { cvDataSelector } from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@store/store-helper";
import React, { useMemo } from "react";

export const GRID_SIZE = 20;

interface PreviewDnDComponents {
  id: string;
  element: React.ReactElement | null;
  position: { x: number; y: number };
}

export function useItems(): PreviewDnDComponents[] {
  const cvData = useAppSelector(cvDataSelector);

  const items = useMemo(() => {
    return [
      {
        id: "personalInfo",
        element: cvData.personalInfo.name ? <PersonalInfoPreviewPage /> : null,
        position: { x: 0, y: 0 },
      },
      {
        id: "contactInfo",
        element: cvData.contactInfo.email ? <ContactInfoPreviewPage /> : null,
        position: { x: 0, y: 80 },
      },
      {
        id: "summary",
        element: cvData.professionalSummary ? <SummaryPreviewPage /> : null,
        position: { x: 0, y: 140 },
      },
      {
        id: "experiences",
        element: cvData.experiences.length ? <ExperiencesPreviewPage /> : null,
        position: { x: 0, y: 280 },
      },
      {
        id: "educations",
        element: cvData.educations.length ? <EducationsPreviewPage /> : null,
        position: { x: 0, y: 760 },
      },
      {
        id: "skills",
        element: cvData.skills.length ? <SkillsPreviewPage /> : null,
        position: { x: 0, y: 1000 },
      },
    ];
  }, [cvData]);

  return items;
}

/** Function to snap the moving component to grid */
export function snapToGrid(n: number): number {
  return Math.round(n / GRID_SIZE) * GRID_SIZE;
}

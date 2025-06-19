import { ContactInfoPreviewPage } from "@pages/preview-page/contact-info-preview-page";
import { EducationsPreviewPage } from "@pages/preview-page/educations-preview-page";
import { ExperiencesPreviewPage } from "@pages/preview-page/experiences-preview-page";
import { PersonalInfoPreviewPage } from "@pages/preview-page/personal-info-preview-page";
import { SkillsPreviewPage } from "@pages/preview-page/skills-preview-page";
import { SummaryPreviewPage } from "@pages/preview-page/summary-preview-page";
import { cvDataSelector } from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@store/store-helper";
import React, { useCallback, useMemo } from "react";

export const GRID_SIZE = 20;

interface ItemProps {
  id: Container;
  element: React.ReactElement | null;
  position: { x: number; y: number };
  column: "left" | "right" | "fullWidth";
}

export type Container =
  | "personalInfo"
  | "contactInfo"
  | "summary"
  | "experiences"
  | "educations"
  | "skills";

export type Column = "fullWidth" | "left" | "right";

export type ItemsMap = Record<string, React.ReactElement | null>;

interface ReturnProps {
  allItems: ItemProps[];
  existedItems: ItemProps[];
  itemsMap: ItemsMap;
  containerBasedOnSide: (side: Column) => Container[];
}

export function useItems(): ReturnProps {
  const cvData = useAppSelector(cvDataSelector);

  const allItems: ItemProps[] = useMemo(() => {
    return [
      {
        id: "personalInfo",
        element: cvData.personalInfo.name ? <PersonalInfoPreviewPage /> : null,
        position: { x: 0, y: 0 },
        column: "fullWidth",
      },
      {
        id: "contactInfo",
        element: cvData.contactInfo.email ? <ContactInfoPreviewPage /> : null,
        position: { x: 0, y: 80 },
        column: "fullWidth",
      },
      {
        id: "summary",
        element: cvData.professionalSummary ? <SummaryPreviewPage /> : null,
        position: { x: 0, y: 140 },
        column: "left",
      },
      {
        id: "experiences",
        element: cvData.experiences.length ? <ExperiencesPreviewPage /> : null,
        position: { x: 0, y: 280 },
        column: "right",
      },
      {
        id: "educations",
        element: cvData.educations.length ? <EducationsPreviewPage /> : null,
        position: { x: 0, y: 760 },
        column: "left",
      },
      {
        id: "skills",
        element: cvData.skills.length ? <SkillsPreviewPage /> : null,
        position: { x: 0, y: 1000 },
        column: "right",
      },
    ];
  }, [cvData]);

  const existedItems = allItems.filter((item) => item.element !== null);

  const itemsMap = useMemo(
    () => Object.fromEntries(existedItems.map((i) => [i.id, i.element])),
    [existedItems]
  );

  const containerBasedOnSide = useCallback(
    (side: Column) => {
      return existedItems
        .filter(({ column }) => column === side)
        .map(({ id }) => id);
    },
    [existedItems]
  );

  return { allItems, existedItems, itemsMap, containerBasedOnSide };
}

/** Function to snap the moving component to grid */
export function snapToGrid(n: number): number {
  return Math.round(n / GRID_SIZE) * GRID_SIZE;
}

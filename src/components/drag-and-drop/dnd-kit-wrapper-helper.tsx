import { ContactInfoPreviewPage } from "@pages/preview-page/contact-info-preview-page";
import { EducationsPreviewPage } from "@pages/preview-page/educations-preview-page";
import { ExperiencesPreviewPage } from "@pages/preview-page/experiences-preview-page";
import { PersonalInfoPreviewPage } from "@pages/preview-page/personal-info-preview-page";
import { SkillsPreviewPage } from "@pages/preview-page/skills-preview-page";
import { SummaryPreviewPage } from "@pages/preview-page/summary-preview-page";
import { cvDataSelector } from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@store/store-helper";
import { useCallback, useMemo } from "react";
import {
  SectionIdToContentMap,
  SectionId,
  SectionProps,
  Side,
  SideToSectionIdMap,
} from "@components/drag-and-drop/dnd-kit-types";

export const GRID_SIZE = 20;

interface ReturnProps {
  sections: SectionProps[];
  availableSections: SectionProps[];
  idToSectionMap: SectionIdToContentMap;
  updatePaperContent: () => {
    fullWidth: SectionId[];
    left: SectionId[];
    right: SectionId[];
  };
}

export function useDndKitWrapper(): ReturnProps {
  const cvData = useAppSelector(cvDataSelector);

  const sections: SectionProps[] = useMemo(() => {
    return [
      {
        id: "personalInfo",
        content: cvData.personalInfo.name ? <PersonalInfoPreviewPage /> : null,
        position: { x: 0, y: 0 },
        layout: "fullWidth",
      },
      {
        id: "contactInfo",
        content: cvData.contactInfo.email ? <ContactInfoPreviewPage /> : null,
        position: { x: 0, y: 80 },
        layout: "fullWidth",
      },
      {
        id: "summary",
        content: cvData.professionalSummary ? <SummaryPreviewPage /> : null,
        position: { x: 0, y: 140 },
        layout: "left",
      },
      {
        id: "experiences",
        content: cvData.experiences.length ? <ExperiencesPreviewPage /> : null,
        position: { x: 0, y: 280 },
        layout: "right",
      },
      {
        id: "educations",
        content: cvData.educations.length ? <EducationsPreviewPage /> : null,
        position: { x: 0, y: 760 },
        layout: "left",
      },
      {
        id: "skills",
        content: cvData.skills.length ? <SkillsPreviewPage /> : null,
        position: { x: 0, y: 1000 },
        layout: "right",
      },
    ];
  }, [cvData]);

  const availableSections = sections.filter(
    ({ content: element }) => element !== null
  );

  const idToSectionMap = useMemo(
    () =>
      Object.fromEntries(
        availableSections.map(({ id, content: element }) => [id, element])
      ) as Record<SectionId, React.ReactElement | null>,
    [availableSections]
  );

  const updatePaperContent: () => Record<Side, SectionId[]> =
    useCallback(() => {
      function getSectionIdsBySide(side: Side): SectionId[] {
        return availableSections
          .filter(({ layout }) => layout === side)
          .map(({ id }) => id);
      }
      return {
        fullWidth: getSectionIdsBySide("fullWidth"),
        left: getSectionIdsBySide("left"),
        right: getSectionIdsBySide("right"),
      };
    }, [availableSections]);

  return {
    sections,
    availableSections,
    idToSectionMap,
    updatePaperContent,
  };
}

/** Function to snap the moving component to grid */
export function snapToGrid(n: number): number {
  return Math.round(n / GRID_SIZE) * GRID_SIZE;
}

/** Returns the side of section by ID */
export function findContentSideById(
  sectionIdsBySide: SideToSectionIdMap,
  id: Side
): Side | null {
  if (id === "fullWidth" || id === "left" || id === "right") {
    return id;
  }
  if (sectionIdsBySide.left.includes(id)) {
    return "left";
  }
  if (sectionIdsBySide.right.includes(id)) {
    return "right";
  }
  if (sectionIdsBySide.fullWidth.includes(id)) {
    return "fullWidth";
  }
  return null;
}

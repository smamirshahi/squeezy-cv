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
  SideToSectionIdMap,
} from "@components/drag-and-drop/dnd-kit-types";
import { GRID_SIZE_PX } from "@custom-styles/custom-styles";
import { Side } from "@custom-types/styles-types";

interface ReturnProps {
  sections: SectionProps[];
  sectionsWithContent: SectionProps[];
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
        side: "fullWidth",
      },
      {
        id: "contactInfo",
        content: cvData.contactInfo.email ? <ContactInfoPreviewPage /> : null,
        position: { x: 0, y: 80 },
        side: "fullWidth",
      },
      {
        id: "summary",
        content: cvData.professionalSummary ? <SummaryPreviewPage /> : null,
        position: { x: 0, y: 140 },
        side: "left",
      },
      {
        id: "experiences",
        content: cvData.experiences.length ? <ExperiencesPreviewPage /> : null,
        position: { x: 0, y: 280 },
        side: "right",
      },
      {
        id: "educations",
        content: cvData.educations.length ? <EducationsPreviewPage /> : null,
        position: { x: 0, y: 760 },
        side: "left",
      },
      {
        id: "skills",
        content: cvData.skills.length ? <SkillsPreviewPage /> : null,
        position: { x: 0, y: 1000 },
        side: "right",
      },
    ];
  }, [cvData]);

  const sectionsWithContent = sections.filter(
    ({ content: element }) => element !== null
  );

  const idToSectionMap = useMemo(
    () =>
      Object.fromEntries(
        sectionsWithContent.map(({ id, content: element }) => [id, element])
      ) as Record<SectionId, React.ReactElement | null>,
    [sectionsWithContent]
  );

  const updatePaperContent: () => Record<Side, SectionId[]> =
    useCallback(() => {
      function getSectionIdsBySide(side: Side): SectionId[] {
        return sectionsWithContent
          .filter(({ side: layout }) => layout === side)
          .map(({ id }) => id);
      }
      return {
        fullWidth: getSectionIdsBySide("fullWidth"),
        left: getSectionIdsBySide("left"),
        right: getSectionIdsBySide("right"),
      };
    }, [sectionsWithContent]);

  return {
    sections,
    sectionsWithContent,
    idToSectionMap,
    updatePaperContent,
  };
}

/** Function to snap the moving component to grid */
export function snapToGrid(n: number): number {
  return Math.round(n / GRID_SIZE_PX) * GRID_SIZE_PX;
}

// FIXME: This is equivalent to `sectionsWithContent`. One of them should be removed
/** Returns all the sections that have content (it is not null) */
export function getSectionsWithContent(
  sections: SectionProps[]
): SectionProps[] {
  return sections.filter(({ content }) => content !== null);
}

/** Returns the side of section by ID */
export function findContentSideById(
  sectionIdsBySide: SideToSectionIdMap,
  id: SectionId
): Side | null {
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

/**
 * Reorder the sections by moving a section ID at "from" and insert it at "to"
 *
 * @param sectionIds - The array of section IDs that is moved and need to be reordered
 */
export function reorderSections<T>(
  sectionIds: readonly T[],
  from: number,
  to: number
): T[] {
  const newArray = sectionIds.slice();
  const [moved] = newArray.splice(from, 1);
  newArray.splice(to, 0, moved);
  return newArray;
}

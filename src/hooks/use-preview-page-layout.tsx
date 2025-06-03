import { useState } from "react";
import { Layout } from "react-grid-layout";
import { PersonalInfoPreviewPage } from "@pages/preview-page/personal-info-preview-page";
import { ContactInfoPreviewPage } from "@pages/preview-page/contact-info-preview-page";
import { SummaryPreviewPage } from "@pages/preview-page/summary-preview-page";
import { ExperiencesPreviewPage } from "@pages/preview-page/experiences-preview-page";
import { SkillsPreviewPage } from "@pages/preview-page/skills-preview-page";
import { EducationsPreviewPage } from "@pages/preview-page/educations-preview-page";
import { SetStateFunction } from "@store/store-helper";

type Components =
  | "personalInfo"
  | "contactInfo"
  | "summaryPage"
  | "experiences"
  | "educations"
  | "skills";

type CustomLayout = Record<
  Components,
  Layout & {
    i: Components;
    component: React.ReactNode;
  }
>;

interface ReturnProps {
  /** The layout of the preview page */
  layout: CustomLayout;

  /** Function to set the layout */
  onLayoutChange: (newLayout: Layout[]) => void;
}

export function usePreviewPageLayout(): ReturnProps {
  function onLayoutChange(newLayout: Layout[]): void {
    console.log("Layout changed:", newLayout);
  }

  const [layout, setLayout] = useState<CustomLayout>({
    personalInfo: {
      i: "personalInfo",
      x: 0,
      y: 0,
      w: 10,
      h: 2,
      component: <PersonalInfoPreviewPage />,
    },
    contactInfo: {
      i: "contactInfo",
      x: 0,
      y: 2,
      w: 10,
      h: 2,
      component: <ContactInfoPreviewPage />,
    },
    summaryPage: {
      i: "summaryPage",
      x: 0,
      y: 4,
      w: 10,
      h: 5,
      component: <SummaryPreviewPage />,
    },
    experiences: {
      i: "experiences",
      x: 0,
      y: 9,
      w: 7,
      h: 17,
      component: <ExperiencesPreviewPage />,
    },
    educations: {
      i: "educations",
      x: 7,
      y: 9,
      w: 4,
      h: 13,
      component: <EducationsPreviewPage />,
    },
    skills: {
      i: "skills",
      x: 7,
      y: 22,
      w: 4,
      h: 4,
      component: <SkillsPreviewPage />,
    },
  });

  return {
    layout,
    onLayoutChange,
  };
}

import { useState } from "react";
import { Layout } from "react-grid-layout";
import { PersonalInfoPreviewPage } from "@pages/preview-page/personal-info-preview-page";
import { ContactInfoPreviewPage } from "@pages/preview-page/contact-info-preview-page";
import { SummaryPreviewPage } from "@pages/preview-page/summary-preview-page";
import { ExperiencesPreviewPage } from "@pages/preview-page/experiences-preview-page";
import { SkillsPreviewPage } from "@pages/preview-page/skills-preview-page";
import { EducationsPreviewPage } from "@pages/preview-page/educations-preview-page";
import { SetStateFunction } from "@store/store-helper";

interface CustomLayout extends Layout {
  component: React.ReactNode;
}

interface ReturnProps {
  /** The layout of the preview page */
  layout: CustomLayout[];

  /** Function to set the layout */
  setLayout: SetStateFunction<CustomLayout[]>;
}

export function usePreviewPageLayout(): ReturnProps {
  const [layout, setLayout] = useState<CustomLayout[]>([
    {
      i: "personalInfo",
      x: 0,
      y: 0,
      w: 10,
      h: 2,
      component: <PersonalInfoPreviewPage />,
    },
    {
      i: "contactInfo",
      x: 0,
      y: 2,
      w: 10,
      h: 2,
      component: <ContactInfoPreviewPage />,
    },
    {
      i: "SummaryPage",
      x: 0,
      y: 4,
      w: 10,
      h: 5,
      component: <SummaryPreviewPage />,
    },
    {
      i: "experiences",
      x: 0,
      y: 9,
      w: 7,
      h: 17,
      component: <ExperiencesPreviewPage />,
    },
    {
      i: "educations",
      x: 7,
      y: 9,
      w: 4,
      h: 13,
      component: <EducationsPreviewPage />,
    },
    { i: "skills", x: 7, y: 22, w: 4, h: 4, component: <SkillsPreviewPage /> },
  ]);

  return {
    layout,
    setLayout,
  };
}

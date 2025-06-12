import { Layout } from "react-grid-layout";
import { PersonalInfoPreviewPage } from "@pages/preview-page/personal-info-preview-page";
import { ContactInfoPreviewPage } from "@pages/preview-page/contact-info-preview-page";
import { SummaryPreviewPage } from "@pages/preview-page/summary-preview-page";
import { ExperiencesPreviewPage } from "@pages/preview-page/experiences-preview-page";
import { SkillsPreviewPage } from "@pages/preview-page/skills-preview-page";
import { EducationsPreviewPage } from "@pages/preview-page/educations-preview-page";

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
}

export function usePreviewPageLayout(): ReturnProps {
  const layout: CustomLayout = {
    personalInfo: {
      i: "personalInfo",
      x: 0,
      y: 0,
      w: 12,
      h: 2,
      component: <PersonalInfoPreviewPage />,
    },
    contactInfo: {
      i: "contactInfo",
      x: 0,
      y: 2,
      w: 12,
      h: 2,
      component: <ContactInfoPreviewPage />,
    },
    summaryPage: {
      i: "summaryPage",
      x: 0,
      y: 4,
      w: 12,
      h: 4,
      component: <SummaryPreviewPage />,
    },
    experiences: {
      i: "experiences",
      x: 0,
      y: 8,
      w: 7,
      h: 17,
      component: <ExperiencesPreviewPage />,
    },
    educations: {
      i: "educations",
      x: 7,
      y: 8,
      w: 5,
      h: 8,
      component: <EducationsPreviewPage />,
    },
    skills: {
      i: "skills",
      x: 7,
      y: 19,
      w: 5,
      h: 6,
      component: <SkillsPreviewPage />,
    },
  };

  return {
    layout,
  };
}

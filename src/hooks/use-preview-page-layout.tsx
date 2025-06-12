import { Layout } from "react-grid-layout";
import { PersonalInfoPreviewPage } from "@pages/preview-page/personal-info-preview-page";
import { ContactInfoPreviewPage } from "@pages/preview-page/contact-info-preview-page";
import { SummaryPreviewPage } from "@pages/preview-page/summary-preview-page";
import { ExperiencesPreviewPage } from "@pages/preview-page/experiences-preview-page";
import { SkillsPreviewPage } from "@pages/preview-page/skills-preview-page";
import { EducationsPreviewPage } from "@pages/preview-page/educations-preview-page";

/** Returns the layout of the preview page */
export function usePreviewPageLayout(): Array<
  Layout & {
    component: React.ReactNode;
  }
> {
  return [
    {
      i: "personalInfo",
      w: 12,
      h: 2,
      x: 0,
      y: 0,
      component: <PersonalInfoPreviewPage />,
    },
    {
      i: "contactInfo",
      w: 12,
      h: 2,
      x: 0,
      y: 2,
      component: <ContactInfoPreviewPage />,
    },
    {
      i: "summaryPage",
      w: 12,
      h: 4,
      x: 0,
      y: 4,
      component: <SummaryPreviewPage />,
    },
    {
      i: "experiences",
      w: 7,
      h: 17,
      x: 0,
      y: 8,
      component: <ExperiencesPreviewPage />,
    },
    {
      i: "educations",
      w: 5,
      h: 8,
      x: 7,
      y: 8,
      component: <EducationsPreviewPage />,
    },
    {
      i: "skills",
      w: 5,
      h: 6,
      x: 7,
      y: 19,
      component: <SkillsPreviewPage />,
    },
  ];
}

import { Object, String, Array, Static } from "runtypes";
import { PersonalInfoSchema } from "@custom-types/personal-info-types";
import { ContactInfoSchema } from "@custom-types/contact-info-types";
import { ProfessionalSummarySchema } from "@custom-types/summary-types";
import { ExperienceSchema } from "@custom-types/experience-types";
import { EducationSchema } from "@custom-types/education-types";
import { SkillCategorySchema } from "@custom-types/skill-types";
import { StyleSchema } from "@custom-types/styles-types";

const DataSchema = Object({
  /** Personal information section */
  personalInfo: PersonalInfoSchema,

  /** Contact information section */
  contactInfo: ContactInfoSchema,

  /** Professional summary section */
  professionalSummary: ProfessionalSummarySchema,

  /** The experiences section */
  experiences: Array(ExperienceSchema),

  /** The educations section */
  educations: Array(EducationSchema),

  /** The skills section */
  skills: Array(SkillCategorySchema),
});

export const MetaDataSchema = Object({
  /** This title serves as a placeholder to describe for what purpose the CV is being written */
  title: String,

  /** A URL for the job where it is posted */
  jobUrl: String,

  /** The version of the CV file. It is used to later track the changes in JSON file and read based upon version */
  version: String.optional(),
});

export const CVJsonSchema = Object({
  /** All the meta data */
  metaData: MetaDataSchema,

  /** The date of the CV file */
  data: DataSchema,

  /** The style of the CV file */
  style: StyleSchema,
});

export type MetaData = Static<typeof MetaDataSchema>;
export type CVData = Static<typeof DataSchema>;
export type CVJson = Static<typeof CVJsonSchema>;

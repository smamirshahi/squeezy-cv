import {
  Object,
  String,
  Array,
  Static,
  Union,
  Literal,
  Boolean,
} from "runtypes";

const PersonalInfoSchema = Object({
  /** The name of the applicant */
  name: String,

  /** The job title of the applicant */
  jobTitle: String,
});

const ContactInfoSchema = Object({
  /** The email of the applicant */
  email: String,

  /** The phone number of the applicant */
  phone: String,

  /** The location of the applicant */
  location: String,

  /** The LinkedIn ID of the applicant */
  linkedInId: String,

  /** The GitHub ID profile of the applicant */
  gitHubId: String,
});

/** The professional summary of the applicant */
const ProfessionalSummarySchema = String;

const ExperienceSchema = Object({
  /** Specific ID for the experience */
  id: String,

  /** The title of the job */
  jobTitle: String,

  /** The company of the work */
  company: String,

  /** The location of job */
  location: String,

  /** The start date of the experience */
  startDate: String,

  /** The end date of the experience. If not available, it means until now */
  endDate: String.optional(),

  /** Bullet points for each experience */
  bulletPoints: Array(String),
});

const EducationSchema = Object({
  /** Specific ID for the education */
  id: String,

  /** The degree of education */
  degree: String,

  /** The institute of the education */
  institute: String,

  /** The location of education */
  location: String,

  /** The start date of the education */
  startDate: String,

  /** The end date of the education. If not available, it means until now */
  endDate: String.optional(),

  /** The title of the education dissertation */
  dissertationTitle: String.optional(),
});

const SkillItemSchema = Object({
  /** The ID of the skill item */
  id: String,

  /** The name of the skill item */
  name: String,

  /* eslint-disable @typescript-eslint/no-magic-numbers */
  /** The number of the skill item from 0 (no skill) to 10 (excellent) */
  rating: Union(
    Literal(0),
    Literal(0.5),
    Literal(1.0),
    Literal(1.5),
    Literal(2.0),
    Literal(2.5),
    Literal(3.0),
    Literal(3.5),
    Literal(4.0),
    Literal(4.5),
    Literal(5.0)
  ),
});
/* eslint-enable @typescript-eslint/no-magic-numbers */

const SkillCategorySchema = Object({
  /** The ID of the skill category */
  id: String,

  /** The name of the skill */
  category: String,

  /** The name of the skill item */
  items: Array(SkillItemSchema),
});

const CVSchema = Object({
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

const StyleSchema = Object({
  /** The template for the CV */
  template: Union(Literal("one-column"), Literal("two-column")),

  /** Whether to show full URL for contact or just the ID */
  shouldShowFullContactLinks: Boolean,

  /** The rating icon */
  ratingIcon: Union(Literal("star"), Literal("circle")),
});

export const CVFileSchema = Object({
  /** The version of the CV file. It is used to later track the changes in JSON file and read based upon version */
  version: String,

  /** The date of the CV file */
  data: CVSchema,

  /** The style of the CV file */
  style: StyleSchema,
});

export type PersonalInfo = Static<typeof PersonalInfoSchema>;
export type ContactInfo = Static<typeof ContactInfoSchema>;
export type ProfessionalSummary = Static<typeof ProfessionalSummarySchema>;
export type Experience = Static<typeof ExperienceSchema>;
export type Education = Static<typeof EducationSchema>;
export type SkillCategory = Static<typeof SkillCategorySchema>;
export type SkillItem = Static<typeof SkillItemSchema>;
export type Style = Static<typeof StyleSchema>;
export type CVData = Static<typeof CVSchema>;
export type CVFile = Static<typeof CVFileSchema>;

import {
  Object,
  String,
  Number,
  Array,
  Static,
  Union,
  Literal,
  Boolean,
} from "runtypes";

const PersonalInfoSchema = Object({
  name: String,
  jobTitle: String,
});

const ContactInfoSchema = Object({
  email: String,
  phone: String,
  location: String,
  linkedInId: String,
  gitHubId: String,
});

const ProfessionalSummarySchema = String;

const ExperienceSchema = Object({
  jobTitle: String,
  company: String,
  location: String,
  startDate: String,
  endDate: String.optional(),
  bulletPoints: Array(String),
});

const EducationSchema = Object({
  degree: String,
  institute: String,
  location: String,
  startDate: String,
  endDate: String.optional(),
  dissertationTitle: String,
});

const SkillItemSchema = Object({
  name: String,
  rating: Number.withConstraint((n) => n >= 1 && n <= 10),
});

const SkillCategorySchema = Object({
  category: String,
  items: Array(SkillItemSchema),
});

const CVSchema = Object({
  personalInfo: PersonalInfoSchema,
  contactInfo: ContactInfoSchema,
  professionalSummary: ProfessionalSummarySchema,
  experiences: Array(ExperienceSchema),
  educations: Array(EducationSchema),
  skills: Array(SkillCategorySchema),
});

const StyleSchema = Object({
  template: Union(Literal("one-column"), Literal("two-column")),
  shouldShowFullContactLinks: Boolean,
  ratingIcon: Union(Literal("star"), Literal("circle")),
});

export const CVFileSchema = Object({
  version: String,
  data: CVSchema,
  style: StyleSchema,
});

export type CVFile = Static<typeof CVFileSchema>;

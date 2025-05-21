import { Object, String, Number, Array, Optional, Static } from "runtypes";

const PersonalInfoSchema = Object({
  name: String,
  jobTitle: String,
});

const ContactInfoSchema = Object({
  email: String,
}).and(
  Object({
    phone: Optional(String),
    location: Optional(String),
    linkedInId: Optional(String),
    gitHubId: Optional(String),
  })
);

const ProfessionalSummarySchema = Object({
  summary: String,
});

const ExperienceSchema = Object({
  jobTitle: String,
  company: String,
  location: String.optional(),
  startDate: String, // ISO date
  endDate: String.optional(),
  bulletPoints: Array(String),
});

const EducationSchema = Object({
  degree: String,
  institute: String,
  location: String.optional(),
  startDate: String,
  endDate: String.optional(),
  dissertationTitle: String.optional(),
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
  experience: Array(ExperienceSchema),
  education: Array(EducationSchema),
  skills: Array(SkillCategorySchema),
});

export const CVFileSchema = Object({
  version: String,
  data: CVSchema,
});

export type CVFile = Static<typeof CVFileSchema>;

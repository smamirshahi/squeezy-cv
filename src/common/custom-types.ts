export interface PersonalInfoProps {
  /** The name of the applicant */
  name: string;

  /** The job title of the applicant */
  jobTitle: string;
}

export interface ContactInfoProps {
  /** The email of the applicant */
  email: string;

  /** The phone number of the applicant */
  phoneNumber?: string;

  /** The location of the applicant */
  location?: string;

  /** The LinkedIn ID of the applicant */
  linkedInId?: string;

  /** The GitHub ID profile of the applicant */
  gitHubId?: string;
}

export interface ProfessionalSummaryProps {
  /** The professional summary of the applicant */
  summary: string;
}

export interface ExperienceProps {
  /** The title of the job or the degree of education */
  jobTitle: string;

  /** The institute of the work/education subsection */
  institute: string;

  /** The location of job/education */
  location: string;

  /** The date of the experience */
  datePeriod: { start: string; end?: string };

  /** The title of the education dissertation */
  dissertationTitle?: string;

  /** Bullet points for each experience */
  bulletPoints?: string[];
}

export interface SkillWithLevelProps {
  /** The name of the skill */
  category: string;
  /** The name of the subSkill */
  item: {
    /** The name of the subSkill */
    name: string;
    /** The percentage of the subSkill */
    rate: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  }[];
}

export interface ApplicationStyle {
  skillIndicatorType: "star" | "circle";
  /** Whether to show the complete link for the social media or not */
  shouldShowCompleteLink?: boolean;
}

export interface ResumeSectionProps {
  nameJobTitle: PersonalInfoProps;
  contactInformation: ContactInfoProps;
  professionalSummary: ProfessionalSummaryProps;
  workExperiences: ExperienceProps[];
  education: ExperienceProps[];
  skills: SkillWithLevelProps[];
  style: ApplicationStyle;
}

/** Templates for Resume */
export type ResumeTemplates = "one-column" | "two-column";

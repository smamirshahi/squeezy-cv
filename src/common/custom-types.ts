export interface NameJobTitleProps {
  /** The name of the applicant */
  name: string;

  /** The job title of the applicant */
  currentJobTitle: string;
}

export interface ContactInformationProps {
  /** The email of the applicant */
  email: string;

  /** The phone number of the applicant */
  phoneNumber: string;

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
  title: string;

  /** The institute of the work/education subsection */
  institute: string;

  /** The date of the experience */
  datePeriod: { start: string; end?: string };

  /** The title of the education dissertation */
  dissertationTitle?: string;

  /** Bullet points for each experience */
  bulletPoints?: string[];
}

export interface GeneralResumeProps {
  nameJobTitle: NameJobTitleProps;
  contactInformation: ContactInformationProps;
  professionalSummary: ProfessionalSummaryProps;
  workExperiences: ExperienceProps[];
  education: ExperienceProps[];
}

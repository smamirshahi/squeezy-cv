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

  /** The LinkedIn profile of the applicant */
  linkedIn?: string;

  /** The GitHub profile of the applicant */
  gitHub?: string;
}

export interface ProfessionalSummaryProps {
  /** The professional summary of the applicant */
  summary: string;
}

export interface WorkExperiencesProps {
  /** The title of the job subsection */
  jobTitle: string;

  /** The location of the work subsection */
  location: string;

  /** The date of the education */
  datePeriod: { start: string; end: string };

  /** Bullet points for each work experience */
  bulletPoints?: string[];
}

export interface EducationProps {
  /** The degree of the applicant */
  degree: string;

  /** The institution of the applicant */
  institution: string;

  /** The date of the education */
  datePeriod: { start: string; end: string };

  /** The title of the dissertation */
  dissertationTitle: string;
}

export interface GeneralResumeProps {
  nameJobTitle: NameJobTitleProps;
  contactInformation: ContactInformationProps;
  professionalSummary: ProfessionalSummaryProps;
  workExperiences: WorkExperiencesProps[];
  education: EducationProps[];
}

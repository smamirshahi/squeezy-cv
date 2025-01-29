export interface GeneralResumeProps {
  nameJobTitle: {
    /** The name of the applicant */
    name: string;

    /** The job title of the applicant */
    currentJobTitle: string;
  };

  contactInformation: {
    /** The email of the applicant */
    email: string;

    /** The phone number of the applicant */
    phoneNumber: string;

    /** The location of the applicant */
    location: string;

    /** The LinkedIn profile of the applicant */
    linkedIn: string;

    /** The GitHub profile of the applicant */
    gitHub: string;
  };

  professionalSummary: {
    /** The professional summary of the applicant */
    summary: string;
  };

  workExperience: {
    /** The title of the job subsection */
    jobTitle: string;

    /** The location of the work subsection */
    location: string;

    /** The date of the education */
    datePeriod: { start: string; end: string };
  }[];

  education: {
    /** The degree of the applicant */
    degree: string;

    /** The institution of the applicant */
    institution: string;

    /** The date of the education */
    datePeriod: { start: string; end: string };

    /** The title of the dissertation */
    dissertationTitle: string;
  }[];
}

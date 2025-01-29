import { GeneralResumeProps } from "./common/custom-types";

export const Application: GeneralResumeProps = {
  nameJobTitle: {
    name: "Dr. Mohammad Amirshahi",
    currentJobTitle: "Software Developer",
  },

  contactInformation: {
    email: "smamirshahi@gmail.com",
    phoneNumber: "(+49) 1577 1531 797",
    location: "Koblenz, Germany",
    linkedIn: "https://www.linkedin.com/in/mohammadamirshahi/",
    // gitHub: "https://github.com/smamirshahi",
  },

  professionalSummary: {
    summary:
      "I am a software developer with a passion for learning and teaching.",
  },

  workExperiences: [
    {
      jobTitle: "Researcher",
      location: "MARUM-University of Bremen",
      datePeriod: { start: "12.2019", end: "Present" },
    },
  ],

  education: [
    {
      degree: "PhD, Earth Science",
      institution: "MARUM - University of Bremen",
      datePeriod: { start: "03.2014", end: "08.2019" },
      dissertationTitle:
        "Dissertation Topic: Turbulent Suspension of Sediments in Shallow Shelf Seas",
    },
    {
      degree: "M.Sc., Civil and Environmental Engineering",
      institution: "Amirkabir University of Technology",
      datePeriod: { start: "09.2010", end: "02.2013" },
      dissertationTitle:
        "Dissertation Topic: Experimental Study of Effect of Turbulence Intensity on Riprap Stability",
    },
  ],
};

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
    linkedInId: "mohammadamirshahi/",
    gitHubId: "smamirshahi",
  },

  professionalSummary: {
    summary:
      "I am a software developer with a passion for learning and teaching.",
  },

  workExperiences: [
    {
      jobTitle: "Software Developer",
      location: "FARO Technologies",
      datePeriod: { start: "2021-06-01" },
    },
    {
      jobTitle: "Software Developer",
      location: "HoloBuilder Inc.",
      datePeriod: { start: "2018-12-01", end: "2021-05-31" },
    },
    {
      jobTitle: "Researcher",
      location: "MARUM-University of Bremen",
      datePeriod: { start: "2014-03-16", end: "2019-08-12" },
    },
  ],

  education: [
    {
      degree: "PhD, Earth Science",
      institution: "MARUM - University of Bremen",
      datePeriod: { start: "2014-03-16", end: "2019-08-12" },
      dissertationTitle:
        "Dissertation Topic: Turbulent Suspension of Sediments in Shallow Shelf Seas",
    },
    {
      degree: "M.Sc., Civil and Environmental Engineering",
      institution: "Amirkabir University of Technology",
      datePeriod: { start: "2010-09-01", end: "2013-02-01" },
      dissertationTitle:
        "Dissertation Topic: Experimental Study of Effect of Turbulence Intensity on Riprap Stability",
    },
  ],
};

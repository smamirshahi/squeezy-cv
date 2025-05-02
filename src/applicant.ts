import { ResumeSectionProps } from "./common/custom-types";

export const Applicant: ResumeSectionProps = {
  style: {
    skillIndicatorType: "star",
  },
  nameJobTitle: {
    name: "Dr. Mohammad Amirshahi",
    currentJobTitle: "Software Developer",
  },

  contactInformation: {
    email: "smamirshahi@gmail.com",
    phoneNumber: "(+49) 1577 1531 797",
    location: "Koblenz, Germany",
    shouldShowCompleteLink: false,
    linkedInId: "mohammadamirshahi",
    gitHubId: "smamirshahi",
  },

  professionalSummary: {
    summary:
      "I am a software developer with a passion for learning and teaching.I am a software developer with a passion for learning and teaching.I am a software developer with a passion for learning and teaching.",
  },

  workExperiences: [
    {
      title: "Software Developer",
      institute: "FARO Technologies",
      location: "Remote",
      datePeriod: { start: "2021-06-01" },
      bulletPoints: [
        "Worked as a front-end software developer on a new Dashboard",
        "Worked with Stellar team",
      ],
    },
    {
      title: "Software Developer",
      institute: "HoloBuilder Inc.",
      location: "Aachen, Germany",
      datePeriod: { start: "2018-12-01", end: "2021-05-31" },
      bulletPoints: [
        "Worked as a front-end software developer on a web-editor and Dashboard",
        "Got experience working with React, Backbone and a bit of Vue",
      ],
    },
    {
      title: "Researcher",
      institute: "MARUM-University of Bremen",
      location: "Bremen, Germany",
      datePeriod: { start: "2014-03-16", end: "2019-08-12" },
      bulletPoints: [
        "Worked on suspended sediment transport and turbulence",
        "participated in 2 research cruises",
      ],
    },
  ],

  education: [
    {
      title: "PhD, Earth Science",
      institute: "MARUM - University of Bremen",
      location: "Bremen, Germany",
      datePeriod: { start: "2014-03-16", end: "2019-08-12" },
      dissertationTitle:
        "Dissertation Topic: Turbulent Suspension of Sediments in Shallow Shelf Seas",
    },
    {
      title: "M.Sc., Civil and Environmental Engineering",
      institute: "Amirkabir University of Technology",
      location: "Tehran, Germany",
      datePeriod: { start: "2010-09-01", end: "2013-02-01" },
      dissertationTitle:
        "Dissertation Topic: Experimental Study of Effect of Turbulence Intensity on Riprap Stability",
    },
  ],

  skills: [
    {
      mainSkillName: "Language",
      subSkill: [
        { name: "English", percentage: 90 },
        { name: "German", percentage: 50 },
      ],
    },
    {
      mainSkillName: "Technical Skills",
      subSkill: [
        { name: "React", percentage: 80 },
        { name: "Backbone", percentage: 70 },
        { name: "Vue", percentage: 60 },
        { name: "Python", percentage: 70 },
        { name: "C++", percentage: 60 },
      ],
    },
  ],
};

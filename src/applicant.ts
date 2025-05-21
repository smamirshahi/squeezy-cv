import { ResumeSectionProps } from "./types/custom-types";

export const Applicant: ResumeSectionProps = {
  style: {
    skillIndicatorType: "star",
    shouldShowFullContactLinks: false,
  },
  nameJobTitle: {
    name: "Dr. Mohammad Amirshahi",
    jobTitle: "Software Developer",
  },

  contactInformation: {
    email: "smamirshahi@gmail.com",
    phoneNumber: "(+49) 1577 1531 797",
    location: "Koblenz, Germany",
    linkedInId: "mohammadamirshahi",
    gitHubId: "smamirshahi",
  },

  professionalSummary: {
    summary:
      "I am a front-end-focused software developer with around seven years of experience, specialising in React and TypeScript. Initially trained as a civil engineer, I hold a PhD in the field but transitioned into software development due to a strong passion for coding and creating impactful applications. Currently based in Germany, I am planning to relocate to the UK in search of broader career opportunities and long-term growth. I am now seeking a new role as a Software Developer where I can contribute to innovative and forward-thinking teams.",
  },

  workExperiences: [
    {
      jobTitle: "Software Developer",
      institute: "FARO Technologies",
      location: "Remote",
      datePeriod: { start: "2021-06-01" },
      bulletPoints: [
        "Part of the development of a modern React-based Dashboard application tailored for managing large-scale companies",
        "Implementing scalable state management solutions using Redux Toolkit",
      ],
    },
    {
      jobTitle: "Junior Software Developer",
      institute: "HoloBuilder Inc.",
      location: "Aachen, Germany",
      datePeriod: { start: "2018-12-01", end: "2021-05-31" },
      bulletPoints: [
        "Contributed to HoloBuilder WebEditor, a construction-focused reality capture tool",
        "Migrated the codebase from Backbone.js to React",
        "Designed and implemented new React components and features",
        "Enhanced HoloBuilder Dashboard, a platform for overseeing construction project data",
        "Built a standalone React application for managing customer subscriptions and sales workflows",
      ],
    },
    {
      jobTitle: "Researcher",
      institute: "MARUM-University of Bremen",
      location: "Bremen, Germany",
      datePeriod: { start: "2014-03-16", end: "2018.06.30" },
      bulletPoints: [
        "Conducted studies on current dynamics in the North Sea, emphasizing near-bed turbulence and sediment transport",
        "participated in 2 research cruises",
        "Participated in two offshore research cruises for field data collection",
        "Developed analysis software to interpret high-frequency turbulence measurements and sediment behaviour",
      ],
    },
  ],

  education: [
    {
      jobTitle: "PhD, Earth Science",
      institute: "University of Bremen",
      location: "Bremen, Germany",
      datePeriod: { start: "2014-03-16", end: "2019-08-12" },
      dissertationTitle:
        "Turbulent Suspension of Sediments in Shallow Shelf Seas",
    },
    {
      jobTitle: "M.Sc., Civil and Environmental Engineering",
      institute: "Amirkabir University of Technology",
      location: "Tehran, Iran",
      datePeriod: { start: "2010-09-22", end: "2013-02-13" },
      dissertationTitle:
        "Experimental Study of Effect of Turbulence Intensity on Riprap Stability",
    },
    {
      jobTitle: "B.Sc., Civil and Environmental Engineering",
      institute: "Amirkabir University of Technology",
      location: "Tehran, Iran",
      datePeriod: { start: "2005-09-23", end: "2010-04-21" },
    },
  ],

  skills: [
    {
      category: "Language",
      item: [
        { name: "English", rate: 9 },
        { name: "German", rate: 5 },
      ],
    },
    {
      category: "Technical Skills",
      item: [
        { name: "React", rate: 8 },
        { name: "Backbone", rate: 7 },
        { name: "Vue", rate: 6 },
        { name: "Python", rate: 7 },
        { name: "C++", rate: 6 },
      ],
    },
  ],
};

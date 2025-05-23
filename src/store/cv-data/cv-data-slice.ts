import { PayloadAction, createSlice, nanoid } from "@reduxjs/toolkit";
import {
  ContactInfo,
  CVData,
  CVFile,
  Education,
  Experience,
  PersonalInfo,
  SkillCategory,
  SkillItem,
  Style,
} from "../../custom-types/json-types";
import {
  findEducation,
  findExperience,
  findSkill,
} from "./cv-data-slice-helper";

/** State of the current CV */
export type cvDataState = CVFile;

export const initialState: cvDataState = {
  version: "1.0",
  data: {
    personalInfo: {
      name: "",
      jobTitle: "",
    },
    contactInfo: {
      email: "",
      phone: "",
      location: "",
      linkedInId: "",
      gitHubId: "",
    },
    professionalSummary: "",
    experiences: [],
    educations: [],
    skills: [],
  },
  style: {
    template: "one-column",
    shouldShowFullContactLinks: true,
    ratingIcon: "star",
  },
};

/** Slice to access state of cv data */
const cvDataSlice = createSlice({
  name: "cvData",
  initialState,
  reducers: {
    setCvData(state, action: PayloadAction<CVData>) {
      state.data = action.payload;
    },

    updatePersonalInfo<K extends keyof PersonalInfo>(
      state: cvDataState,
      action: PayloadAction<{
        field: K;
        value: PersonalInfo[K];
      }>
    ) {
      state.data.personalInfo[action.payload.field] = action.payload.value;
    },

    updateContactInfo<K extends keyof ContactInfo>(
      state: cvDataState,
      action: PayloadAction<{
        field: K;
        value: ContactInfo[K];
      }>
    ) {
      state.data.contactInfo[action.payload.field] = action.payload.value;
    },

    updateProfessionalSummary(
      state,
      action: PayloadAction<{
        value: string;
      }>
    ) {
      state.data.professionalSummary = action.payload.value;
    },

    addExperience: (state) => {
      state.data.experiences.push({
        id: nanoid(),
        jobTitle: "",
        company: "",
        location: "",
        startDate: "",
        endDate: "",
        bulletPoints: [],
      });
    },

    removeExperience: (state, action: PayloadAction<string>) => {
      state.data.experiences = state.data.experiences.filter(
        (exp) => exp.id !== action.payload
      );
    },

    updateExperience: <K extends keyof Experience>(
      state: cvDataState,
      action: PayloadAction<{
        id: string;
        key: K;
        value: Experience[K];
      }>
    ) => {
      const exp = findExperience(state, action.payload.id);
      if (exp) {
        exp[action.payload.key] = action.payload.value;
      }
    },

    addBulletPoint: (state, action: PayloadAction<{ id: string }>) => {
      const exp = findExperience(state, action.payload.id);
      exp?.bulletPoints.push("");
    },

    updateExperienceBulletPoint: (
      state,
      action: PayloadAction<{
        id: string;
        index: number;
        value: string;
      }>
    ) => {
      const exp = findExperience(state, action.payload.id);
      if (exp?.bulletPoints[action.payload.index] !== undefined) {
        exp.bulletPoints[action.payload.index] = action.payload.value;
      }
    },

    removeBulletPoint: (
      state,
      action: PayloadAction<{ id: string; index: number }>
    ) => {
      const exp = findExperience(state, action.payload.id);
      if (exp?.bulletPoints[action.payload.index] !== undefined) {
        exp.bulletPoints.splice(action.payload.index, 1); // mutates via Immer
      }
    },

    addEducation: (state) => {
      state.data.educations.push({
        id: nanoid(),
        degree: "",
        institute: "",
        location: "",
        startDate: "",
        endDate: "",
        dissertationTitle: "",
      });
    },

    removeEducation: (state, action: PayloadAction<string>) => {
      state.data.educations = state.data.educations.filter(
        (edu) => edu.id !== action.payload
      );
    },

    updateEducation: <K extends keyof Education>(
      state: cvDataState,
      action: PayloadAction<{
        id: string;
        key: K;
        value: Education[K];
      }>
    ) => {
      const edu = findEducation(state, action.payload.id);
      if (edu) {
        edu[action.payload.key] = action.payload.value;
      }
    },

    addSkillCategory: (state) => {
      state.data.skills.push({
        id: nanoid(),
        category: "",
        items: [
          {
            id: nanoid(),
            name: "",
            // FIXME: Correct the number in here
            rating: 0,
          },
        ],
      });
    },

    removeSkillCategory: (state, action: PayloadAction<string>) => {
      state.data.skills = state.data.skills.filter(
        (skill) => skill.id !== action.payload
      );
    },

    updateSkillCategory: <K extends keyof SkillCategory>(
      state: cvDataState,
      action: PayloadAction<{
        id: string;
        key: K;
        value: SkillCategory[K];
      }>
    ) => {
      const skill = findSkill(state, action.payload.id);
      if (skill) {
        skill[action.payload.key] = action.payload.value;
      }
    },

    updateSkillItem: <K extends keyof SkillItem>(
      state: cvDataState,
      action: PayloadAction<{
        id: string;
        index: number;
        key: K;
        value: SkillItem[K];
      }>
    ) => {
      const { index, key, value } = action.payload;
      const skill = findSkill(state, action.payload.id);
      if (skill && skill.items[index] !== undefined) {
        skill.items[index][key] = value;
      }
    },

    addSkillItem: (state, action: PayloadAction<{ skillId: string }>) => {
      const skill = findSkill(state, action.payload.skillId);
      if (skill) {
        skill.items.push({
          id: nanoid(),
          name: "",
          rating: 0,
        });
      }
    },

    removeSkillItem: (
      state,
      action: PayloadAction<{ skillId: string; index: number }>
    ) => {
      const skill = findSkill(state, action.payload.skillId);
      if (skill && skill.items[action.payload.index] !== undefined) {
        skill.items.splice(action.payload.index, 1); // ✅ safe with Immer
      }
    },

    setTemplate(state, action: PayloadAction<Style["template"]>) {
      state.style.template = action.payload;
    },

    resetCvDataState: () => initialState,
  },
  selectors: {
    versionSelector: (state: cvDataState) => state.version,
    cvDataSelector: (state: cvDataState) => state.data,
    styleSelector: (state: cvDataState) => state.style,
  },
});

export const { versionSelector, cvDataSelector, styleSelector } =
  cvDataSlice.selectors;
export const {
  setCvData,
  setTemplate,
  updatePersonalInfo,
  updateContactInfo,
  updateProfessionalSummary,
  addExperience,
  removeExperience,
  updateExperience,
  addBulletPoint,
  updateExperienceBulletPoint,
  removeBulletPoint,
  addEducation,
  removeEducation,
  updateEducation,
  addSkillCategory,
  removeSkillCategory,
  updateSkillCategory,
  addSkillItem,
  removeSkillItem,
  updateSkillItem,
  resetCvDataState,
} = cvDataSlice.actions;

export const cvDataReducer = cvDataSlice.reducer;

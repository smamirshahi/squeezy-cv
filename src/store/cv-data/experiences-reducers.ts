import { PayloadAction, nanoid } from "@reduxjs/toolkit";
import { CvDataState } from "@store/cv-data/cv-data-slice";
import { Experience } from "@custom-types/json-types";
import { findExperience } from "@store/cv-data/cv-data-slice-helper";

export const experiencesReducers = {
  addExperience: (state: CvDataState) => {
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

  removeExperience: (state: CvDataState, action: PayloadAction<string>) => {
    state.data.experiences = state.data.experiences.filter(
      (exp) => exp.id !== action.payload
    );
  },

  updateExperience: <K extends keyof Experience>(
    state: CvDataState,
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

  addBulletPoint: (
    state: CvDataState,
    action: PayloadAction<{ id: string }>
  ) => {
    const exp = findExperience(state, action.payload.id);
    exp?.bulletPoints.push("");
  },

  updateExperienceBulletPoint: (
    state: CvDataState,
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
    state: CvDataState,
    action: PayloadAction<{ id: string; index: number }>
  ) => {
    const exp = findExperience(state, action.payload.id);
    if (exp?.bulletPoints[action.payload.index] !== undefined) {
      exp.bulletPoints.splice(action.payload.index, 1);
    }
  },
};

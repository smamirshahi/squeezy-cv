import { PayloadAction, nanoid } from "@reduxjs/toolkit";
import { CvDataState } from "@store/cv-data/cv-data-slice";
import { Experience } from "@custom-types/experience-types";
import {
  findBulletPointById,
  findExperienceById,
} from "@store/cv-data/cv-data-slice-helper";

export const experiencesReducers = {
  addExperience: (state: CvDataState) => {
    state.data.experiences.push({
      id: nanoid(),
      jobTitle: "",
      company: "",
      location: "",
      startDate: "",
      endDate: "",
      bulletPoints: [{ id: nanoid(), text: "" }],
      shouldShow: true,
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
      experienceId: string;
      key: K;
      value: Experience[K];
    }>
  ) => {
    const exp = findExperienceById(state, action.payload.experienceId);
    if (exp) {
      exp[action.payload.key] = action.payload.value;
    }
  },

  addBulletPoint: (
    state: CvDataState,
    action: PayloadAction<{ experienceId: string }>
  ) => {
    const exp = findExperienceById(state, action.payload.experienceId);
    exp?.bulletPoints.push({ id: nanoid(), text: "" });
  },

  updateExperienceBulletPoint: (
    state: CvDataState,
    action: PayloadAction<{
      bulletPointId: string;
      value: string;
    }>
  ) => {
    const { bulletPointId, value } = action.payload;
    const bulletPoint = findBulletPointById(state, bulletPointId);
    if (bulletPoint) {
      bulletPoint.text = value;
    }
  },

  removeBulletPoint: (
    state: CvDataState,
    action: PayloadAction<{ experienceId: string; bulletPointId: string }>
  ) => {
    const { experienceId, bulletPointId } = action.payload;
    const exp = findExperienceById(state, experienceId);
    if (exp) {
      exp.bulletPoints = exp.bulletPoints.filter(
        (bp) => bp.id !== bulletPointId
      );
    }
  },
};

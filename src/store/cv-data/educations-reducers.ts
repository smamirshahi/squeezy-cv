import { Education } from "@custom-types/education-types";
import { PayloadAction, nanoid } from "@reduxjs/toolkit";
import { CvDataState } from "@store/cv-data/cv-data-slice";
import { findEducation } from "@store/cv-data/cv-data-slice-helper";

export const educationsReducers = {
  addEducation: (state: CvDataState) => {
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

  removeEducation: (state: CvDataState, action: PayloadAction<string>) => {
    state.data.educations = state.data.educations.filter(
      (edu) => edu.id !== action.payload
    );
  },

  updateEducation: <K extends keyof Education>(
    state: CvDataState,
    action: PayloadAction<{
      educationId: string;
      key: K;
      value: Education[K];
    }>
  ) => {
    const edu = findEducation(state, action.payload.educationId);
    if (edu) {
      edu[action.payload.key] = action.payload.value;
    }
  },
};

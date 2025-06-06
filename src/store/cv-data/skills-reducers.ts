import { PayloadAction, nanoid } from "@reduxjs/toolkit";
import { CvDataState } from "@store/cv-data/cv-data-slice";
import { SkillCategory, SkillItem } from "@custom-types/json-types";
import { findSkill } from "@store/cv-data/cv-data-slice-helper";

export const skillsReducers = {
  addSkillCategory: (state: CvDataState) => {
    state.data.skills.push({
      id: nanoid(),
      category: "",
      items: [
        {
          id: nanoid(),
          name: "",
          rating: 0,
        },
      ],
    });
  },

  removeSkillCategory: (state: CvDataState, action: PayloadAction<string>) => {
    state.data.skills = state.data.skills.filter(
      (skill) => skill.id !== action.payload
    );
  },

  updateSkillCategory: <K extends keyof SkillCategory>(
    state: CvDataState,
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

  addSkillItem: (
    state: CvDataState,
    action: PayloadAction<{ skillId: string }>
  ) => {
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
    state: CvDataState,
    action: PayloadAction<{ skillId: string; index: number }>
  ) => {
    const skill = findSkill(state, action.payload.skillId);
    if (skill && skill.items[action.payload.index] !== undefined) {
      skill.items.splice(action.payload.index, 1);
    }
  },

  updateSkillItem: <K extends keyof SkillItem>(
    state: CvDataState,
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
};

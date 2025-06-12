import { PayloadAction, nanoid } from "@reduxjs/toolkit";
import { CvDataState } from "@store/cv-data/cv-data-slice";
import { SkillCategory, SkillItem } from "@custom-types/skill-types";
import {
  findSkillById,
  findSkillItemById,
} from "@store/cv-data/cv-data-slice-helper";

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
      skillId: string;
      key: K;
      value: SkillCategory[K];
    }>
  ) => {
    const skill = findSkillById(state, action.payload.skillId);
    if (skill) {
      skill[action.payload.key] = action.payload.value;
    }
  },

  addSkillItem: (
    state: CvDataState,
    action: PayloadAction<{ skillId: string }>
  ) => {
    const skill = findSkillById(state, action.payload.skillId);
    skill?.items.push({
      id: nanoid(),
      name: "",
      rating: 0,
    });
  },

  updateSkillItem: <K extends keyof SkillItem>(
    state: CvDataState,
    action: PayloadAction<{
      skillId: string;
      skillItemId: string;
      key: K;
      value: SkillItem[K];
    }>
  ) => {
    const { skillId, skillItemId, key, value } = action.payload;
    const skillItem = findSkillItemById(state, skillId, skillItemId);
    if (skillItem) {
      skillItem[key] = value;
    }
  },

  removeSkillItem: (
    state: CvDataState,
    action: PayloadAction<{ skillId: string; skillItemId: string }>
  ) => {
    const { skillId, skillItemId } = action.payload;
    const skill = findSkillById(state, skillId);
    if (skill) {
      skill.items = skill.items.filter((item) => item.id !== skillItemId);
    }
  },
};

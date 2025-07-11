import { SkillCategory } from "@custom-types/skill-types";
import { nanoid } from "@reduxjs/toolkit";
import { appSelector, setShouldAddNewItem } from "@store/app/app-slice";
import {
  SetStateFunction,
  useAppDispatch,
  useAppSelector,
} from "@store/store-helper";
import { useEffect } from "react";

interface Props {
  setNewSkills: SetStateFunction<SkillCategory[]>;
}

interface ReturnProps {
  updateSkillCategory: (id: string, update: Partial<SkillCategory>) => void;
  removeSkillCategory: (id: string) => void;
  updateSkillItem: (
    categoryId: string,
    itemId: string,
    update: { name?: string; rating?: number }
  ) => void;
  removeSkillItem: (categoryId: string, itemId: string) => void;
  addSkillItem: (categoryId: string) => void;
}

export function useEditorSkills({ setNewSkills }: Props): ReturnProps {
  const dispatch = useAppDispatch();
  const { shouldAddNewItem } = useAppSelector(appSelector);

  useEffect(() => {
    /** Adds a new skill category with default structure */
    function addSkillCategory(): void {
      setNewSkills((prev) => [
        ...prev,
        {
          id: nanoid(),
          category: "",
          items: [{ id: nanoid(), name: "", rating: 0 }],
        },
      ]);
    }
    if (shouldAddNewItem) {
      addSkillCategory();
      dispatch(setShouldAddNewItem(false));
    }
  }, [dispatch, setNewSkills, shouldAddNewItem]);

  /** Helper to update a single category by ID */
  function updateCategoryById(
    id: string,
    updater: (cat: SkillCategory) => SkillCategory
  ): void {
    setNewSkills((prev) =>
      prev.map((cat) => (cat.id === id ? updater(cat) : cat))
    );
  }

  function updateSkillCategory(
    id: string,
    update: Partial<SkillCategory>
  ): void {
    updateCategoryById(id, (cat) => ({ ...cat, ...update }));
  }

  function removeSkillCategory(id: string): void {
    setNewSkills((prev) => prev.filter((cat) => cat.id !== id));
  }

  function updateSkillItem(
    categoryId: string,
    itemId: string,
    update: { name?: string }
  ): void {
    updateCategoryById(categoryId, (cat) => ({
      ...cat,
      items: cat.items.map((item) =>
        item.id === itemId ? { ...item, ...update } : item
      ),
    }));
  }

  function removeSkillItem(categoryId: string, itemId: string): void {
    updateCategoryById(categoryId, (cat) => ({
      ...cat,
      items: cat.items.filter((item) => item.id !== itemId),
    }));
  }

  function addSkillItem(categoryId: string): void {
    updateCategoryById(categoryId, (cat) => ({
      ...cat,
      items: [...cat.items, { id: nanoid(), name: "", rating: 0 }],
    }));
  }

  return {
    updateSkillCategory,
    removeSkillCategory,
    updateSkillItem,
    removeSkillItem,
    addSkillItem,
  };
}

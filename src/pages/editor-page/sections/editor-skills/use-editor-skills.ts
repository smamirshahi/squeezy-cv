import { SkillCategory } from "@custom-types/skill-types";
import { nanoid } from "@reduxjs/toolkit";
import { appSelector, setShouldAddNewItem } from "@store/app/app-slice";
import { setSkillVisibilityById } from "@store/cv-data/cv-data-slice";
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
  swapSkillCategories(index1: number, index2: number): void;
  swapSkillItems(categoryId: string, index1: number, index2: number): void;
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
          shouldShow: true,
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

    if ("shouldShow" in update) {
      dispatch(setSkillVisibilityById({ id, shouldShow: !!update.shouldShow }));
    }
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

  /** Swap the skill categories order */
  function swapSkillCategories(index1: number, index2: number): void {
    setNewSkills((prev) => {
      // no change if out of bounds
      if (
        index1 < 0 ||
        index2 < 0 ||
        index1 >= prev.length ||
        index2 >= prev.length
      ) {
        return prev;
      }
      const newArray = [...prev];
      const temp = newArray[index1];
      newArray[index1] = newArray[index2];
      newArray[index2] = temp;
      return newArray;
    });
  }

  function swapSkillItems(
    categoryId: string,
    index1: number,
    index2: number
  ): void {
    updateCategoryById(categoryId, (cat) => {
      const newItems = [...cat.items];
      if (
        index1 < 0 ||
        index2 < 0 ||
        index1 >= newItems.length ||
        index2 >= newItems.length
      ) {
        return cat;
      }
      const temp = newItems[index1];
      newItems[index1] = newItems[index2];
      newItems[index2] = temp;
      return { ...cat, items: newItems };
    });
  }

  return {
    updateSkillCategory,
    removeSkillCategory,
    updateSkillItem,
    removeSkillItem,
    addSkillItem,
    swapSkillCategories,
    swapSkillItems,
  };
}

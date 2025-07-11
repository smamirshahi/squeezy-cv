import { SkillCategory } from "@custom-types/skill-types";
import { nanoid } from "@reduxjs/toolkit";
import { SetStateFunction } from "@store/store-helper";

interface Props {
  setNewSkills: SetStateFunction<SkillCategory[]>;
}

interface ReturnProps {
  updateSkillCategory: (id: string, update: Partial<SkillCategory>) => void;
  removeSkillCategory: (id: string) => void;
  addSkillCategory: () => void;
  updateSkillItem: (
    categoryId: string,
    itemId: string,
    update: { name?: string; rating?: number }
  ) => void;
  removeSkillItem: (categoryId: string, itemId: string) => void;
  addSkillItem: (categoryId: string) => void;
}

export function useEditorSkills({ setNewSkills }: Props): ReturnProps {
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
    addSkillCategory,
    updateSkillItem,
    removeSkillItem,
    addSkillItem,
  };
}

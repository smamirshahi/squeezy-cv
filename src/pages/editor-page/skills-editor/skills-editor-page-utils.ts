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

export function useSkillsEditorPage({ setNewSkills }: Props): ReturnProps {
  function updateSkillCategory(
    id: string,
    update: Partial<SkillCategory>
  ): void {
    setNewSkills((prev) =>
      prev.map((sk) => (sk.id === id ? { ...sk, ...update } : sk))
    );
  }

  function removeSkillCategory(id: string): void {
    setNewSkills((prev) => prev.filter((sk) => sk.id !== id));
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
    setNewSkills((prev) =>
      prev.map((sk) =>
        sk.id === categoryId
          ? {
              ...sk,
              items: sk.items.map((item) =>
                item.id === itemId ? { ...item, ...update } : item
              ),
            }
          : sk
      )
    );
  }

  function removeSkillItem(categoryId: string, itemId: string): void {
    setNewSkills((prev) =>
      prev.map((sk) =>
        sk.id === categoryId
          ? { ...sk, items: sk.items.filter((item) => item.id !== itemId) }
          : sk
      )
    );
  }

  function addSkillItem(categoryId: string): void {
    setNewSkills((prev) =>
      prev.map((sk) =>
        sk.id === categoryId
          ? {
              ...sk,
              items: [...sk.items, { id: nanoid(), name: "", rating: 0 }],
            }
          : sk
      )
    );
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

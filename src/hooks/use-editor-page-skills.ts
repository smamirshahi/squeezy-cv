import { useEffect, useState } from "react";
import { nanoid } from "nanoid";
import { SkillCategory, SkillItem } from "@custom-types/json-types";
import { cvDataSelector } from "@store/cv-data/cv-data-slice";
import { SetStateFunction, useAppSelector } from "@store/store-helper";

interface ReturnProps {
  skills: SkillCategory[];
  setSkills: SetStateFunction<SkillCategory[]>;
  addSkillCategory(): void;
  removeSkillCategory(id: string): void;
  updateSkillCategory<K extends keyof SkillCategory>(
    id: string,
    key: K,
    value: SkillCategory[K]
  ): void;
  updateSkillItem<K extends keyof SkillItem>(
    skillId: string,
    index: number,
    key: K,
    value: SkillItem[K]
  ): void;
  addSkillItem(skillId: string): void;
  removeSkillItem(skillId: string, index: number): void;
}

export function useEditorPageSkills(): ReturnProps {
  const cvData = useAppSelector(cvDataSelector);
  const [skills, setSkills] = useState<SkillCategory[]>(cvData.skills);

  useEffect(() => {
    setSkills(cvData.skills);
  }, [cvData.skills]);

  function addSkillCategory(): void {
    setSkills((prev) => [
      ...prev,
      {
        id: nanoid(),
        category: "",
        items: [{ id: nanoid(), name: "", rating: 0 }],
      },
    ]);
  }

  function removeSkillCategory(id: string): void {
    setSkills((prev) => prev.filter((item) => item.id !== id));
  }

  function updateSkillCategory<K extends keyof SkillCategory>(
    id: string,
    key: K,
    value: SkillCategory[K]
  ): void {
    setSkills((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [key]: value } : s))
    );
  }

  function updateSkillItem<K extends keyof SkillItem>(
    skillId: string,
    index: number,
    key: K,
    value: SkillItem[K]
  ): void {
    setSkills((prev) =>
      prev.map((s) => {
        if (s.id !== skillId) {
          return s;
        }
        const updatedItems = s.items.map((item, i) =>
          i === index ? { ...item, [key]: value } : item
        );
        return { ...s, items: updatedItems };
      })
    );
  }

  function addSkillItem(skillId: string): void {
    setSkills((prev) =>
      prev.map((s) =>
        s.id === skillId
          ? {
              ...s,
              items: [...s.items, { id: nanoid(), name: "", rating: 0 }],
            }
          : s
      )
    );
  }

  function removeSkillItem(skillId: string, index: number): void {
    setSkills((prev) =>
      prev.map((s) =>
        s.id === skillId
          ? {
              ...s,
              items: s.items.filter((_, i) => i !== index),
            }
          : s
      )
    );
  }

  return {
    skills,
    setSkills,
    addSkillCategory,
    removeSkillCategory,
    updateSkillCategory,
    updateSkillItem,
    addSkillItem,
    removeSkillItem,
  };
}

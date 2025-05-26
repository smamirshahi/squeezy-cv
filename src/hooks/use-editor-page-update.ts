import { useState } from "react";
import { nanoid } from "nanoid";
import {
  Education,
  Experience,
  SkillCategory,
  SkillItem,
} from "@src/custom-types/json-types";
import { cvDataSelector } from "@src/store/cv-data/cv-data-slice";
import { SetStateFunction, useAppSelector } from "@src/store/store-helper";

interface ReturnProps {
  experiences: Experience[];
  setExperiences: SetStateFunction<Experience[]>;
  addExperience(): void;
  removeExperience(id: string): void;
  updateExperience<K extends keyof Experience>(
    id: string,
    key: K,
    value: Experience[K]
  ): void;
  addBulletPoint(id: string): void;
  updateExperienceBulletPoint(id: string, index: number, value: string): void;
  removeBulletPoint(id: string, index: number): void;
  educations: Education[];
  setEducations: SetStateFunction<Education[]>;
  addEducation(): void;
  removeEducation(id: string): void;
  updateEducation<K extends keyof Education>(
    id: string,
    key: K,
    value: Education[K]
  ): void;
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

export function useEditorPageUpdate(): ReturnProps {
  const cvData = useAppSelector(cvDataSelector);
  const [experiences, setExperiences] = useState<Experience[]>(
    cvData.experiences
  );
  const [educations, setEducations] = useState<Education[]>(cvData.educations);
  const [skills, setSkills] = useState<SkillCategory[]>(cvData.skills);

  function addExperience(): void {
    setExperiences((prev) => [
      ...prev,
      {
        id: nanoid(),
        jobTitle: "",
        company: "",
        location: "",
        startDate: "",
        endDate: "",
        bulletPoints: [],
      },
    ]);
  }

  function removeById<T extends { id: string }>(
    setFn: React.Dispatch<React.SetStateAction<T[]>>,
    id: string
  ): void {
    setFn((prev) => prev.filter((item) => item.id !== id));
  }

  function removeExperience(id: string): void {
    removeById(setExperiences, id);
  }

  function updateExperience<K extends keyof Experience>(
    id: string,
    key: K,
    value: Experience[K]
  ): void {
    setExperiences((prev) =>
      prev.map((exp) => (exp.id === id ? { ...exp, [key]: value } : exp))
    );
  }

  function addBulletPoint(id: string): void {
    setExperiences((prev) =>
      prev.map((exp) =>
        exp.id === id
          ? { ...exp, bulletPoints: [...exp.bulletPoints, ""] }
          : exp
      )
    );
  }

  function updateExperienceBulletPoint(
    id: string,
    index: number,
    value: string
  ): void {
    setExperiences((prev) =>
      prev.map((exp) =>
        exp.id === id
          ? {
              ...exp,
              bulletPoints: exp.bulletPoints.map((bp, i) =>
                i === index ? value : bp
              ),
            }
          : exp
      )
    );
  }

  function removeBulletPoint(id: string, index: number): void {
    setExperiences((prev) =>
      prev.map((exp) =>
        exp.id === id
          ? {
              ...exp,
              bulletPoints: exp.bulletPoints.filter((_, i) => i !== index),
            }
          : exp
      )
    );
  }

  // Education
  function addEducation(): void {
    setEducations((prev) => [
      ...prev,
      {
        id: nanoid(),
        degree: "",
        institute: "",
        location: "",
        startDate: "",
        endDate: "",
        dissertationTitle: "",
      },
    ]);
  }

  function removeEducation(id: string): void {
    removeById(setEducations, id);
  }

  function updateEducation<K extends keyof Education>(
    id: string,
    key: K,
    value: Education[K]
  ): void {
    setEducations((prev) =>
      prev.map((edu) => (edu.id === id ? { ...edu, [key]: value } : edu))
    );
  }

  // Skills
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
    removeById(setSkills, id);
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
    experiences,
    setExperiences,
    addExperience,
    removeExperience,
    updateExperience,
    addBulletPoint,
    updateExperienceBulletPoint,
    removeBulletPoint,
    educations,
    setEducations,
    addEducation,
    removeEducation,
    updateEducation,
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

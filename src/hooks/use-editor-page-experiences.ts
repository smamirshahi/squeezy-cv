import { useEffect } from "react";
import { nanoid } from "nanoid";
import { Experience } from "@custom-types/json-types";
import { cvDataSelector } from "@store/cv-data/cv-data-slice";
import { SetStateFunction, useAppSelector } from "@store/store-helper";

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
}

interface Props {
  /** The experiences to edit */
  experiences: Experience[];

  /** Setter for the experiences to edit */
  setExperiences: SetStateFunction<Experience[]>;
}

export function useEditorPageExperiences({
  experiences,
  setExperiences,
}: Props): ReturnProps {
  const cvData = useAppSelector(cvDataSelector);

  useEffect(() => {
    setExperiences(cvData.experiences);
  }, [cvData.experiences, setExperiences]);

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

  function removeExperience(id: string): void {
    setExperiences((prev) => prev.filter((item) => item.id !== id));
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

  return {
    experiences,
    setExperiences,
    addExperience,
    removeExperience,
    updateExperience,
    addBulletPoint,
    updateExperienceBulletPoint,
    removeBulletPoint,
  };
}

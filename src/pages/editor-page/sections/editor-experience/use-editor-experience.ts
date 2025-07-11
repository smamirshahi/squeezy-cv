import { Experience } from "@custom-types/experience-types";
import { nanoid } from "@reduxjs/toolkit";
import { SetStateFunction } from "@store/store-helper";

interface Props {
  setNewExperiences: SetStateFunction<Experience[]>;
}

interface ReturnProps {
  addExperience: () => void;
  removeExperience: (id: string) => void;
  updateExperience: (id: string, update: Partial<Experience>) => void;
}

export function useEditorExperience({ setNewExperiences }: Props): ReturnProps {
  /** Updates a single experience by ID */
  function updateExperienceById(
    id: string,
    updater: (exp: Experience) => Experience
  ): void {
    setNewExperiences((prev) =>
      prev.map((exp) => (exp.id === id ? updater(exp) : exp))
    );
  }

  /** Adds a new experience with default structure */
  function addExperience(): void {
    setNewExperiences((prev) => [
      ...prev,
      {
        id: nanoid(),
        jobTitle: "",
        company: "",
        location: "",
        startDate: "",
        endDate: "",
        shouldShow: true,
        bulletPoints: [""],
      },
    ]);
  }

  /** Removes an experience by ID */
  function removeExperience(id: string): void {
    setNewExperiences((prev) => prev.filter((exp) => exp.id !== id));
  }

  /** Updates top-level fields of an experience */
  function updateExperience(id: string, update: Partial<Experience>): void {
    updateExperienceById(id, (exp) => ({ ...exp, ...update }));
  }

  return {
    addExperience,
    removeExperience,
    updateExperience,
  };
}

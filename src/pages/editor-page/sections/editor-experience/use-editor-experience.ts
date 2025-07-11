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
  addBulletPoint: (experienceId: string) => void;
  updateBulletPoint: (
    experienceId: string,
    bulletPointId: string,
    text: string
  ) => void;
  removeBulletPoint: (experienceId: string, bulletPointId: string) => void;
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
        bulletPoints: [{ id: nanoid(), text: "" }],
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

  /** Adds a bullet point */
  function addBulletPoint(experienceId: string): void {
    updateExperienceById(experienceId, (exp) => ({
      ...exp,
      bulletPoints: [...exp.bulletPoints, { id: nanoid(), text: "" }],
    }));
  }

  /** Updates text of a bullet point */
  function updateBulletPoint(
    experienceId: string,
    bulletPointId: string,
    text: string
  ): void {
    updateExperienceById(experienceId, (exp) => ({
      ...exp,
      bulletPoints: exp.bulletPoints.map((bp) =>
        bp.id === bulletPointId ? { ...bp, text } : bp
      ),
    }));
  }

  /** Removes a bullet point */
  function removeBulletPoint(
    experienceId: string,
    bulletPointId: string
  ): void {
    updateExperienceById(experienceId, (exp) => ({
      ...exp,
      bulletPoints: exp.bulletPoints.filter((bp) => bp.id !== bulletPointId),
    }));
  }

  return {
    addExperience,
    removeExperience,
    updateExperience,
    addBulletPoint,
    updateBulletPoint,
    removeBulletPoint,
  };
}

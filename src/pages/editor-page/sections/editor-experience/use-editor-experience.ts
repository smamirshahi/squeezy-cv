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
  /** Updates the experience by id */
  function updateExperienceById(
    id: string,
    updater: (exp: Experience) => Experience
  ): void {
    setNewExperiences((prev) =>
      prev.map((exp) => (exp.id === id ? updater(exp) : exp))
    );
  }

  function updateExperience(id: string, update: Partial<Experience>): void {
    updateExperienceById(id, (exp) => ({ ...exp, ...update }));
  }

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

  function removeBulletPoint(
    experienceId: string,
    bulletPointId: string
  ): void {
    updateExperienceById(experienceId, (exp) => ({
      ...exp,
      bulletPoints: exp.bulletPoints.filter((bp) => bp.id !== bulletPointId),
    }));
  }

  function addBulletPoint(experienceId: string): void {
    updateExperienceById(experienceId, (exp) => ({
      ...exp,
      bulletPoints: [...exp.bulletPoints, { id: nanoid(), text: "" }],
    }));
  }

  function removeExperience(id: string): void {
    setNewExperiences((prev) => prev.filter((exp) => exp.id !== id));
  }

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

  return {
    updateExperience,
    updateBulletPoint,
    removeBulletPoint,
    addBulletPoint,
    removeExperience,
    addExperience,
  };
}

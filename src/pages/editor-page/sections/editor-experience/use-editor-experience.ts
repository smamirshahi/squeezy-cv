import { Experience } from "@custom-types/experience-types";
import { nanoid } from "@reduxjs/toolkit";
import { SetStateFunction } from "@store/store-helper";

interface Props {
  setNewExperiences: SetStateFunction<Experience[]>;
}

interface ReturnProps {
  updateExperience: (id: string, update: Partial<Experience>) => void;
  updateBulletPoint: (
    experienceId: string,
    bulletPointId: string,
    text: string
  ) => void;
  removeBulletPoint: (experienceId: string, bulletPointId: string) => void;
  addBulletPoint: (experienceId: string) => void;
  removeExperience: (id: string) => void;
  addExperience: () => void;
}

export function useEditorExperience({ setNewExperiences }: Props): ReturnProps {
  function updateExperience(id: string, update: Partial<Experience>): void {
    setNewExperiences((prev) =>
      prev.map((exp) => (exp.id === id ? { ...exp, ...update } : exp))
    );
  }

  function updateBulletPoint(
    experienceId: string,
    bulletPointId: string,
    text: string
  ): void {
    setNewExperiences((prev) =>
      prev.map((exp) =>
        exp.id === experienceId
          ? {
              ...exp,
              bulletPoints: exp.bulletPoints.map((bp) =>
                bp.id === bulletPointId ? { ...bp, text } : bp
              ),
            }
          : exp
      )
    );
  }

  function removeBulletPoint(
    experienceId: string,
    bulletPointId: string
  ): void {
    setNewExperiences((prev) =>
      prev.map((exp) =>
        exp.id === experienceId
          ? {
              ...exp,
              bulletPoints: exp.bulletPoints.filter(
                (bp) => bp.id !== bulletPointId
              ),
            }
          : exp
      )
    );
  }

  function addBulletPoint(experienceId: string): void {
    setNewExperiences((prev) =>
      prev.map((exp) =>
        exp.id === experienceId
          ? {
              ...exp,
              bulletPoints: [...exp.bulletPoints, { id: nanoid(), text: "" }],
            }
          : exp
      )
    );
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

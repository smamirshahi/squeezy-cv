import { Education } from "@custom-types/education-types";
import { nanoid } from "@reduxjs/toolkit";
import { SetStateFunction } from "@store/store-helper";

interface Props {
  setNewEducations: SetStateFunction<Education[]>;
}

interface ReturnProps {
  updateEducation: (id: string, update: Partial<Education>) => void;
  removeEducation: (id: string) => void;
  addEducation: () => void;
}

export function useEducationEditorPage({
  setNewEducations,
}: Props): ReturnProps {
  function updateEducation(id: string, update: Partial<Education>): void {
    setNewEducations((prev) =>
      prev.map((edu) => (edu.id === id ? { ...edu, ...update } : edu))
    );
  }

  function removeEducation(id: string): void {
    setNewEducations((prev) => prev.filter((edu) => edu.id !== id));
  }

  function addEducation(): void {
    setNewEducations((prev) => [
      ...prev,
      {
        id: nanoid(),
        degree: "",
        institute: "",
        location: "",
        startDate: "",
        endDate: "",
        dissertationTitle: "",
        shouldShow: true,
      },
    ]);
  }

  return {
    updateEducation,
    removeEducation,
    addEducation,
  };
}

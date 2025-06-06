import { useEffect } from "react";
import { nanoid } from "nanoid";
import { Education } from "@custom-types/json-types";
import { cvDataSelector } from "@store/cv-data/cv-data-slice";
import { SetStateFunction, useAppSelector } from "@store/store-helper";

interface ReturnProps {
  educations: Education[];
  setEducations: SetStateFunction<Education[]>;
  addEducation(): void;
  removeEducation(id: string): void;
  updateEducation<K extends keyof Education>(
    id: string,
    key: K,
    value: Education[K]
  ): void;
}

interface Props {
  /** The educations to edit */
  educations: Education[];

  /** Setter for the educations to edit */
  setEducations: SetStateFunction<Education[]>;
}

export function useEditorPageEducations({
  educations,
  setEducations,
}: Props): ReturnProps {
  const cvData = useAppSelector(cvDataSelector);

  useEffect(() => {
    setEducations(cvData.educations);
  }, [cvData.educations, setEducations]);

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
    setEducations((prev) => prev.filter((item) => item.id !== id));
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

  return {
    educations,
    setEducations,
    addEducation,
    removeEducation,
    updateEducation,
  };
}

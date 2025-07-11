import { Education } from "@custom-types/education-types";
import { nanoid } from "@reduxjs/toolkit";
import { appSelector, setShouldAddNewItem } from "@store/app/app-slice";
import {
  SetStateFunction,
  useAppDispatch,
  useAppSelector,
} from "@store/store-helper";
import { useEffect } from "react";

interface Props {
  setNewEducations: SetStateFunction<Education[]>;
}

interface ReturnProps {
  updateEducation: (id: string, update: Partial<Education>) => void;
  removeEducation: (id: string) => void;
}

export function useEditorEducation({ setNewEducations }: Props): ReturnProps {
  const dispatch = useAppDispatch();
  const { shouldAddNewItem } = useAppSelector(appSelector);

  useEffect(() => {
    /** Adds a new education with default structure */
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
    if (shouldAddNewItem) {
      addEducation();
      dispatch(setShouldAddNewItem(false));
    }
  }, [dispatch, setNewEducations, shouldAddNewItem]);

  function updateEducation(id: string, update: Partial<Education>): void {
    setNewEducations((prev) =>
      prev.map((edu) => (edu.id === id ? { ...edu, ...update } : edu))
    );
  }

  function removeEducation(id: string): void {
    setNewEducations((prev) => prev.filter((edu) => edu.id !== id));
  }

  return {
    updateEducation,
    removeEducation,
  };
}

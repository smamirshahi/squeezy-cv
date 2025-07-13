import { Education } from "@custom-types/education-types";
import { nanoid } from "@reduxjs/toolkit";
import { appSelector, setShouldAddNewItem } from "@store/app/app-slice";
import { setEducationVisibilityById } from "@store/cv-data/cv-data-slice";
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
  swapEducations(index1: number, index2: number): void;
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

    if ("shouldShow" in update) {
      dispatch(
        setEducationVisibilityById({ id, shouldShow: !!update.shouldShow })
      );
    }
  }

  function removeEducation(id: string): void {
    setNewEducations((prev) => prev.filter((edu) => edu.id !== id));
  }

  /** Swap the experience order */
  function swapEducations(index1: number, index2: number): void {
    setNewEducations((prev) => {
      // no change if out of bounds
      if (
        index1 < 0 ||
        index2 < 0 ||
        index1 >= prev.length ||
        index2 >= prev.length
      ) {
        return prev;
      }
      const newArray = [...prev];
      const temp = newArray[index1];
      newArray[index1] = newArray[index2];
      newArray[index2] = temp;
      return newArray;
    });
  }

  return {
    updateEducation,
    removeEducation,
    swapEducations,
  };
}

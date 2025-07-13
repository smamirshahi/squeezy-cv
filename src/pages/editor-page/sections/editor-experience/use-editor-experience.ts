import { Experience } from "@custom-types/experience-types";
import { nanoid } from "@reduxjs/toolkit";
import { appSelector, setShouldAddNewItem } from "@store/app/app-slice";
import { setExperienceVisibilityById } from "@store/cv-data/cv-data-slice";
import {
  SetStateFunction,
  useAppDispatch,
  useAppSelector,
} from "@store/store-helper";
import { useEffect } from "react";

interface Props {
  setNewExperiences: SetStateFunction<Experience[]>;
}

interface ReturnProps {
  removeExperience: (id: string) => void;
  updateExperience: (id: string, update: Partial<Experience>) => void;
  swapExperiences(index1: number, index2: number): void;
}

export function useEditorExperience({ setNewExperiences }: Props): ReturnProps {
  const dispatch = useAppDispatch();
  const { shouldAddNewItem } = useAppSelector(appSelector);

  useEffect(() => {
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
    if (shouldAddNewItem) {
      addExperience();
      dispatch(setShouldAddNewItem(false));
    }
  }, [dispatch, setNewExperiences, shouldAddNewItem]);

  /** Updates a single experience by ID */
  function updateExperienceById(
    id: string,
    updater: (exp: Experience) => Experience
  ): void {
    setNewExperiences((prev) =>
      prev.map((exp) => (exp.id === id ? updater(exp) : exp))
    );
  }

  /** Removes an experience by ID */
  function removeExperience(id: string): void {
    setNewExperiences((prev) => prev.filter((exp) => exp.id !== id));
  }

  /** Updates top-level fields of an experience */
  function updateExperience(id: string, update: Partial<Experience>): void {
    updateExperienceById(id, (exp) => ({ ...exp, ...update }));

    if ("shouldShow" in update) {
      dispatch(
        setExperienceVisibilityById({ id, shouldShow: !!update.shouldShow })
      );
    }
  }

  /** Swap the experience order */
  function swapExperiences(index1: number, index2: number): void {
    setNewExperiences((prev) => {
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
    removeExperience,
    updateExperience,
    swapExperiences,
  };
}

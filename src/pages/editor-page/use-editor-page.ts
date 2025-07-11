import {
  appSelector,
  setShouldApplyChanges,
  setShouldDiscardChanges,
} from "@store/app/app-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { useEffect } from "react";

interface Props {
  onApplyChanges: () => void;
  onDiscardChanges: () => void;
}

export function useEditorPage({
  onApplyChanges,
  onDiscardChanges,
}: Props): void {
  const dispatch = useAppDispatch();
  const { shouldApplyChanges, shouldDiscardChanges } =
    useAppSelector(appSelector);

  useEffect(() => {
    if (shouldApplyChanges) {
      onApplyChanges();
      dispatch(setShouldApplyChanges(false));
    }
  }, [dispatch, onApplyChanges, shouldApplyChanges]);

  useEffect(() => {
    if (shouldDiscardChanges) {
      onDiscardChanges();
      dispatch(setShouldDiscardChanges(false));
    }
  }, [dispatch, onDiscardChanges, shouldDiscardChanges]);
}

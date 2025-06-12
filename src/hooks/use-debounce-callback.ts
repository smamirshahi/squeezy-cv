import { useEffect, useRef, useState } from "react";
import { SetStateFunction, useAppDispatch } from "@store/store-helper";
import { UnknownAction } from "@reduxjs/toolkit";

interface Props<T> {
  /** The value in the redux store */
  reduxState: T;

  /** The reducer action to update the redux state */
  createAction: (value: T) => UnknownAction;
}

interface ReturnProps<T> {
  /** The local state */
  localState: T;

  /** Setter for localState */
  setLocalState: SetStateFunction<T>;
}

/** Debouncing in MM */
const DEBOUNCE_IN_MM = 500;

/** A function that adds debouncing to reducer action  */
export function useDebounceCallback<T>({
  reduxState,
  createAction,
}: Props<T>): ReturnProps<T> {
  const [localState, setLocalState] = useState(reduxState);
  const dispatch = useAppDispatch();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalState(reduxState);
  }, [reduxState, setLocalState]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      if (localState !== reduxState) {
        dispatch(createAction(localState));
      }
    }, DEBOUNCE_IN_MM);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [createAction, dispatch, localState, reduxState]);

  return {
    localState,
    setLocalState,
  };
}

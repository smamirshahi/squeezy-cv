import { useEffect, useRef, useState } from "react";
import { SetStateFunction, useAppDispatch } from "@store/store-helper";
import { UnknownAction } from "@reduxjs/toolkit";

interface Props<T> {
  reduxState: T;
  action: (payload: T) => UnknownAction;
}

interface ReturnProps<T> {
  localState: T;
  setLocalState: SetStateFunction<T>;
}

const DEBOUNCE_IN_MM = 500;

export function useDebounceCallback<T>({
  reduxState,
  action,
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
        dispatch(action(localState));
      }
    }, DEBOUNCE_IN_MM);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localState]);

  return {
    localState,
    setLocalState,
  };
}

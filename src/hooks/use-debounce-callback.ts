import { useEffect, useRef } from "react";
import { useAppDispatch } from "@store/store-helper";
import { UnknownAction } from "@reduxjs/toolkit";

interface Props<T> {
  reduxState: T;

  localState: T;
  action: (payload: T) => UnknownAction;
}

const DEBOUNCE_IN_MM = 500;

export function useDebounceCallback<T>({
  localState,
  reduxState,
  action,
}: Props<T>): void {
  const dispatch = useAppDispatch();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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
}

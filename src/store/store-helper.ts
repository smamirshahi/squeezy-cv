// eslint-disable-next-line no-restricted-imports -- The only place needed to define useAppDispatch and useAppSelector
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { store } from "@store/store";
import { Dispatch, SetStateAction } from "react";

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppStore = typeof store;

// Use throughout app instead of plain `useDispatch` and `useSelector` to get type-safety
export function useAppDispatch(): AppDispatch {
  return useDispatch<AppDispatch>();
}

export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

/** A custom type to be used for setters in localState */
export type SetStateFunction<T> = Dispatch<SetStateAction<T>>;

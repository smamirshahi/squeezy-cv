import { AvailableFonts } from "@custom-types/styles-types";
import { appSelector } from "@store/app/app-slice";
import { useAppSelector } from "@store/store-helper";
import { useCallback } from "react";

interface ReturnProps {
  isTextSelected: (variant: AvailableFonts) => boolean;
}

export function useCvTypographyUtils(): ReturnProps {
  const { selectedTypography } = useAppSelector(appSelector);

  const isTextSelected = useCallback(
    (variant: AvailableFonts) => {
      return selectedTypography === null || variant === selectedTypography;
    },
    [selectedTypography]
  );

  return {
    isTextSelected,
  };
}

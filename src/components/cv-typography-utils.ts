import { AvailableFonts } from "@custom-types/styles-types";
import { appSelector } from "@store/app/app-slice";
import { useAppSelector } from "@store/store-helper";
import { useCallback } from "react";

interface ReturnProps {
  isTextSelected: (variant: AvailableFonts) => boolean;
  opacity: (variant: AvailableFonts) => number;
}

export function useCvTypographyUtils(): ReturnProps {
  const { selectedTypography } = useAppSelector(appSelector);

  const isTextSelected = useCallback(
    (variant: AvailableFonts) => {
      return selectedTypography === null || variant === selectedTypography;
    },
    [selectedTypography]
  );

  const opacity = useCallback(
    (variant: AvailableFonts) => {
      if (isTextSelected(variant)) {
        return 1;
      }
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      return 0.2;
    },
    [isTextSelected]
  );

  return {
    isTextSelected,
    opacity,
  };
}

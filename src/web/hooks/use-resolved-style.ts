import { useMemo } from "react";
import { Colors, FontStyle, AvailableFonts } from "@custom-types/styles-types";
import {
  accentOf,
  colorsOf,
  resolveTypography,
} from "@shared/style/resolve-style";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@store/store-helper";

interface ResolvedStyle {
  typography: Record<AvailableFonts, FontStyle>;
  colors: Colors;
  /** The accent colour, or the text colour when there is no accent */
  accent: string;
}

/** The styles and colours the page is drawn with (see `resolveTypography`) */
export function useResolvedStyle(): ResolvedStyle {
  const style = useAppSelector(styleSelector);
  return useMemo(() => {
    const colors = colorsOf(style);
    return {
      typography: resolveTypography(style),
      colors,
      accent: accentOf(colors),
    };
  }, [style]);
}

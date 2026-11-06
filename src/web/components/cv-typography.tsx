import { AvailableFonts } from "@custom-types/styles-types";
import { SxProps, Typography } from "@mui/material";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@store/store-helper";
import { useMemo } from "react";
import { useCvTypographyUtils } from "@components/cv-typography-utils";

interface TypographyVariantProps {
  /** The variant of the typography */
  variant: AvailableFonts;

  /** The text to display */
  text: string;

  /** Draws the text bold (an item highlighted in the variant) */
  isEmphasised?: boolean;
}

/** Creates a new typography which is connected to store */
export function CvTypography({
  variant,
  text,
  isEmphasised = false,
}: TypographyVariantProps): JSX.Element {
  const { typography } = useAppSelector(styleSelector);
  const { opacity } = useCvTypographyUtils();

  const additionalStyle: SxProps = useMemo(() => {
    switch (variant) {
      case "headingLg":
        return {};
      case "headingMd":
        return { borderBottom: "2px solid black", width: "100%" };
      case "headingSm":
        return {};
      case "bodyLg":
        return {};
      case "bodyMd":
        return {};
      case "bodySm":
        return {};
      case "bulletText":
        return {};
      case "icon":
        return {};
    }
  }, [variant]);

  return (
    <Typography
      sx={{
        ...typography[variant],
        p: "0px",
        m: "0px",
        opacity: opacity(variant),
        ...additionalStyle,
        ...(isEmphasised ? { fontWeight: 700 } : {}),
      }}
      gutterBottom
    >
      {text}
    </Typography>
  );
}

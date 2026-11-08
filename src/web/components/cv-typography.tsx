import { AvailableFonts } from "@custom-types/styles-types";
import { GAP_PX, spaced } from "@custom-styles/custom-styles";
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

  /** Makes the text a hyperlink to this (already checked http(s)) address */
  href?: string;

  /** Draws the text bold (an item highlighted in the variant) */
  isEmphasised?: boolean;

  /**
   * Page breaks: "keep-with-next" for headings (stay on the page of what follows),
   * "avoid-inside" for a paragraph that must not be split
   */
  pageBreak?: "keep-with-next" | "avoid-inside";
}

/** Creates a new typography which is connected to store */
export function CvTypography({
  variant,
  text,
  href,
  isEmphasised = false,
  pageBreak,
}: TypographyVariantProps): JSX.Element {
  const { typography, sectionSpacing, hasHeadingLine } =
    useAppSelector(styleSelector);
  const { opacity } = useCvTypographyUtils();

  const additionalStyle: SxProps = useMemo(() => {
    switch (variant) {
      case "headingLg":
        return {};
      case "headingMd":
        return {
          borderBottom: hasHeadingLine === false ? "none" : "2px solid black",
          width: "100%",
          mt: spaced(sectionSpacing ?? GAP_PX.sectionTop),
        };
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
  }, [variant, sectionSpacing, hasHeadingLine]);

  return (
    <Typography
      {...(href
        ? { component: "a", href, target: "_blank", rel: "noopener noreferrer" }
        : {})}
      sx={{
        ...typography[variant],
        p: "0px",
        m: "0px",
        opacity: opacity(variant),
        // Auto-fit can scale all text through the paper's --cv-font-scale
        fontSize: `calc(${typography[variant].fontSize} * var(--cv-font-scale, 1))`,
        ...additionalStyle,
        ...(href ? { color: "inherit", textDecoration: "underline" } : {}),
        ...(isEmphasised ? { fontWeight: 700 } : {}),
        ...(pageBreak ? { breakInside: "avoid" } : {}),
        ...(pageBreak === "keep-with-next" ? { breakAfter: "avoid" } : {}),
      }}
      data-cv-block={pageBreak ? "" : undefined}
      data-cv-keep={pageBreak === "keep-with-next" ? "" : undefined}
      gutterBottom
    >
      {text}
    </Typography>
  );
}

import { SectionStyle } from "@custom-types/variant-types";
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

  /** Draws the text bold (an item highlighted in the variant) */
  isEmphasised?: boolean;

  /**
   * Page breaks: "keep-with-next" for headings (stay on the page of what follows),
   * "avoid-inside" for a paragraph that must not be split
   */
  pageBreak?: "keep-with-next" | "avoid-inside";

  /** Section heading only: the template's style for this section */
  sectionStyle?: SectionStyle;
}

/** Creates a new typography which is connected to store */
export function CvTypography({
  variant,
  text,
  isEmphasised = false,
  pageBreak,
  sectionStyle,
}: TypographyVariantProps): JSX.Element {
  const { typography } = useAppSelector(styleSelector);
  const { opacity } = useCvTypographyUtils();

  const headingSize =
    variant === "headingMd" && sectionStyle?.headingSize
      ? `${sectionStyle.headingSize}pt`
      : undefined;

  const additionalStyle: SxProps = useMemo(() => {
    switch (variant) {
      case "headingLg":
        return {};
      case "headingMd":
        return {
          borderBottom:
            sectionStyle?.showDivider === false ? "none" : "2px solid black",
          width: "100%",
          mt: spaced(sectionStyle?.spaceAbove ?? GAP_PX.sectionTop),
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
  }, [variant, sectionStyle]);

  return (
    <Typography
      sx={{
        ...typography[variant],
        p: "0px",
        m: "0px",
        opacity: opacity(variant),
        // Auto-fit can scale all text through the paper's --cv-font-scale
        fontSize: `calc(${headingSize ?? typography[variant].fontSize} * var(--cv-font-scale, 1))`,
        ...additionalStyle,
        ...(variant === "headingMd" && sectionStyle?.headingColor
          ? { color: sectionStyle.headingColor }
          : {}),
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

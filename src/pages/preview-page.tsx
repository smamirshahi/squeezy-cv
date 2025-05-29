import { Paper } from "@mui/material";
import { A4_HEIGHT_MM, A4_WIDTH_MM } from "@custom-types/custom-styles";
import { useAppSelector } from "@store/store-helper";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { useMemo } from "react";
import { OneColumnPreviewPage } from "@pages/preview-page/one-column-preview-page";
import { TwoColumnPreviewPage } from "@pages/preview-page/two-column-preview-page";

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

export function PreviewPage({ contentRef }: Props): JSX.Element | null {
  const { template } = useAppSelector(styleSelector);

  const content = useMemo(() => {
    switch (template) {
      case "one-column":
        return <OneColumnPreviewPage />;

      case "two-column":
        return <TwoColumnPreviewPage />;

      default:
        return null;
    }
  }, [template]);

  return (
    <Paper
      ref={contentRef}
      elevation={3}
      sx={{
        width: `${A4_WIDTH_MM}mm`,
        minHeight: `${A4_HEIGHT_MM}mm`,
        padding: "20mm",
        boxSizing: "border-box",
        mx: "auto",
        fontSize: "12pt",
        fontFamily: "Calibri, sans-serif",
      }}
    >
      {content}
    </Paper>
  );
}

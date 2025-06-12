import { Paper } from "@mui/material";
import { A4_DIMENSION_MM } from "@custom-styles/custom-styles";
import { OneColumnPreviewPage } from "@pages/preview-page/one-column-preview-page";

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

export function PreviewPage({ contentRef }: Props): JSX.Element | null {
  return (
    <Paper
      ref={contentRef}
      elevation={3}
      sx={{
        width: `${A4_DIMENSION_MM.width}mm`,
        minHeight: `${A4_DIMENSION_MM.height}mm`,
        padding: "20mm",
        boxSizing: "border-box",
        mx: "auto",
        fontSize: "12pt",
        fontFamily: "Calibri, sans-serif",
      }}
    >
      <OneColumnPreviewPage />
    </Paper>
  );
}

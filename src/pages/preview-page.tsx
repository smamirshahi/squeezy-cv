import { Paper } from "@mui/material";
import { A4_HEIGHT_MM, A4_WIDTH_MM } from "../common/custom-styles";
import { TemplateSelection } from "../templates/template-selection";
import { useAppSelector } from "../store/store-helper";
import { styleSelector } from "../store/applicant/applicant-slice";

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

export function PreviewPage({ contentRef }: Props): JSX.Element {
  const { template } = useAppSelector(styleSelector);

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
      {/* <Divider
        sx={{
          position: "absolute",
          top: `${A4_HEIGHT_MM}mm`,
          width: `${A4_WIDTH_MM}mm`,
          border: "1px solid red",
        }}
      /> */}
      {template !== null && <TemplateSelection template={template} />}
    </Paper>
  );
}

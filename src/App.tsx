import { Box } from "@mui/material";
import { useRef } from "react";
import { EditorPage } from "@pages/editor-page";
import { PreviewPage } from "@pages/preview-page";

export function App(): JSX.Element {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <Box
      sx={{
        width: "500mm",
        display: "flex",
        gap: 2,
        padding: 2,
        justifyContent: "center",
        alignItems: "flex-start",
        overflowX: "auto",
        backgroundColor: "#f0f0f0",
      }}
    >
      <EditorPage contentRef={contentRef} />
      <PreviewPage contentRef={contentRef} />
    </Box>
  );
}

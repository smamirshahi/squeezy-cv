import { Paper, Box } from "@mui/material";
import { A4_DIMENSION_MM } from "@custom-styles/custom-styles";
import { useEditorPages } from "@pages/editor-page/editor-pages";
import { EditorFooter } from "@pages/editor-page/editor-footer";
import { EditorAppBar } from "@pages/editor-page/editor-app-bar";
import { EditorSideBar } from "@pages/editor-page/editor-side-bar";
import { useAppSelector } from "@store/store-helper";
import { appSelector } from "@store/app/app-slice";

/** Shows the editor section */
export function EditorPage(): JSX.Element {
  const { selectedSectionInEditorPage } = useAppSelector(appSelector);
  const editorPageSections = useEditorPages();

  // A deleted or unknown page falls back to the first one
  const selectedPage =
    editorPageSections.find(
      (page) => page.id === selectedSectionInEditorPage
    ) ?? editorPageSections[0];

  return (
    <Paper
      elevation={3}
      sx={{
        // Grows up to the old fixed width, shrinks (and wraps below the preview's row) on narrow screens
        flex: "1 1 480px",
        maxWidth: `${A4_DIMENSION_MM.height}mm`,
        minWidth: 0,
        padding: "0mm",
        boxSizing: "border-box",
        mx: "auto",
        fontSize: "12pt",
        fontFamily: "Calibri, sans-serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <Box sx={{ height: "800px", overflowY: "scroll" }}>
        <EditorAppBar />
        <Box display="flex" flexDirection="row" gap={2} p={2}>
          <EditorSideBar editorPageSections={editorPageSections} />
          <Box sx={{ width: "100%" }}>{selectedPage.content}</Box>
        </Box>
      </Box>
      <EditorFooter />
    </Paper>
  );
}

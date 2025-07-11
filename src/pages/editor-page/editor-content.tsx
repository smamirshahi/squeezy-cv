import { Box } from "@mui/material";
import { appSelector } from "@store/app/app-slice";
import { useAppSelector } from "@store/store-helper";
import { EditorPageSection } from "@pages/editor-page/editor-types";

interface Props {
  editorPageSections: EditorPageSection;
}

export function EditorContent({ editorPageSections }: Props): JSX.Element {
  const { selectedSectionInEditorPage } = useAppSelector(appSelector);

  return (
    <Box sx={{ width: "100%" }}>
      {editorPageSections[selectedSectionInEditorPage].component}
    </Box>
  );
}

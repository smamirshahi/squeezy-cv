import { useEffect } from "react";
import { Box, Divider } from "@mui/material";
import { EditorJobs } from "@pages/editor-page/sections/editor-jobs";
import { EditorMetaData } from "@pages/editor-page/sections/editor-meta-data";
import { EditorFooter } from "@pages/editor-page/editor-footer";
import {
  MIDDLE_AREA_SX,
  WORKSPACE_COLORS,
} from "@pages/workspace/workspace-tokens";
import { setSelectedSectionInEditorPage } from "@store/app/app-slice";
import { useAppDispatch } from "@store/store-helper";

/** The "Job settings" view of the Jobs tool: the job, what it shows, and its private job data */
export function JobSettingsPage(): JSX.Element {
  const dispatch = useAppDispatch();
  // The Apply/Discard footer follows the selected editor page; job data is the one that needs it
  useEffect(() => {
    dispatch(setSelectedSectionInEditorPage("metaData"));
  }, [dispatch]);

  return (
    <Box
      component="main"
      aria-label="Job settings"
      sx={{
        flex: 1,
        minWidth: 0,
        overflow: "auto",
        p: 3,
        mx: 1,
        ...MIDDLE_AREA_SX,
      }}
    >
      <Box sx={{ maxWidth: 1000, mx: "auto", display: "grid", gap: 2 }}>
        <EditorJobs />
        <Divider />
        <Box
          component="section"
          aria-label="Job data"
          sx={{ bgcolor: WORKSPACE_COLORS.panel, borderRadius: 1, p: 2 }}
        >
          <EditorMetaData />
        </Box>
      </Box>
      <EditorFooter />
    </Box>
  );
}

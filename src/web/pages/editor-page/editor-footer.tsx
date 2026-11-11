import { Box, Button } from "@mui/material";
import {
  appSelector,
  setShouldApplyChanges,
  setShouldDiscardChanges,
} from "@store/app/app-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { cssVar } from "@custom-styles/theme";
import { shouldShowApplyButton } from "@pages/editor-page/editor-footer-utils";

export function EditorFooter(): JSX.Element | null {
  const dispatch = useAppDispatch();
  const { selectedSectionInEditorPage } = useAppSelector(appSelector);

  if (!shouldShowApplyButton(selectedSectionInEditorPage)) {
    return null;
  }

  return (
    <Box
      // A fixed row below the scrolling part of the middle area, so it is always at the very bottom
      sx={{
        flex: "none",
        display: "flex",
        justifyContent: "flex-end",
        gap: 2,
        px: 3,
        py: 1.5,
        bgcolor: cssVar("bg"),
        borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
      }}
    >
      <Button onClick={() => dispatch(setShouldDiscardChanges(true))}>
        Discard
      </Button>
      <Button
        variant="contained"
        onClick={() => dispatch(setShouldApplyChanges(true))}
      >
        Apply
      </Button>
    </Box>
  );
}

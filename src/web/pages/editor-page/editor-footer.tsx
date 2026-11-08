import { Box, Button } from "@mui/material";
import {
  appSelector,
  setShouldAddNewItem,
  setShouldApplyChanges,
  setShouldDiscardChanges,
} from "@store/app/app-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { sectionsSelector } from "@store/vault/vault-slice";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { cssVar } from "@custom-styles/theme";
import { getAddButtonLabel } from "@pages/editor-page/editor-footer-utils";

export function EditorFooter(): JSX.Element | null {
  const dispatch = useAppDispatch();
  const { selectedSectionInEditorPage } = useAppSelector(appSelector);
  const sections = useAppSelector(sectionsSelector);

  const { shouldShowApplyButton, addNewItemButtonLabel } = getAddButtonLabel(
    selectedSectionInEditorPage,
    sections
  );

  if (!shouldShowApplyButton) {
    return null;
  }

  return (
    <Box
      // Stays at the bottom of the scrolling middle area, always reachable. The negative
      // margins let it span the area's padding.
      sx={{
        position: "sticky",
        bottom: 0,
        zIndex: 2,
        display: "flex",
        justifyContent: "flex-end",
        gap: 2,
        mx: -3,
        mb: -3,
        px: 3,
        py: 1.5,
        bgcolor: cssVar("bg"),
        borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
      }}
    >
      {addNewItemButtonLabel && (
        <Button
          variant="contained"
          onClick={() => dispatch(setShouldAddNewItem(true))}
        >
          {addNewItemButtonLabel}
        </Button>
      )}

      <Button
        variant="contained"
        onClick={() => dispatch(setShouldApplyChanges(true))}
      >
        Apply
      </Button>
      <Button
        variant="contained"
        onClick={() => dispatch(setShouldDiscardChanges(true))}
      >
        Discard
      </Button>
    </Box>
  );
}

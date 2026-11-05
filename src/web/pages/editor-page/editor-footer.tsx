import { Box, Button } from "@mui/material";
import {
  appSelector,
  setShouldAddNewItem,
  setShouldApplyChanges,
  setShouldDiscardChanges,
} from "@store/app/app-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { sectionsSelector } from "@store/vault/vault-slice";
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
      display="flex"
      justifyContent="flex-end"
      sx={{ mr: "20px", my: "20px" }}
      gap={2}
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

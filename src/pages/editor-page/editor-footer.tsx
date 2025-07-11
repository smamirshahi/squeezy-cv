import { Box, Button } from "@mui/material";
import {
  appSelector,
  setShouldApplyChanges,
  setShouldDiscardChanges,
} from "@store/app/app-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { useEffect, useState } from "react";

export function EditorFooter(): JSX.Element | null {
  const dispatch = useAppDispatch();

  const [shouldShowApplyButton, setShouldShowApplyButton] =
    useState<boolean>(true);
  const { selectedSectionInEditorPage } = useAppSelector(appSelector);

  useEffect(() => {
    switch (selectedSectionInEditorPage) {
      case "metadata":
      case "mainInfo":
      case "summary":
      case "experiences":
      case "educations":
      case "skills":
        setShouldShowApplyButton(true);
        break;
      case "typography":
      case "template":
        setShouldShowApplyButton(false);
        break;
    }
  }, [selectedSectionInEditorPage]);

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

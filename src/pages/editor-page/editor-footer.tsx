import { Box, Button } from "@mui/material";
import {
  appSelector,
  setShouldAddNewItem,
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
  const [addNewItemButtonLabel, setAddNewItemButtonLabel] =
    useState<string>("");

  useEffect(() => {
    switch (selectedSectionInEditorPage) {
      case "metaData":
      case "mainInfo":
      case "summary":
      case "experiences":
      case "educations":
      case "skills":
        setShouldShowApplyButton(true);
        break;
      case "styleSettings":
      case "pageStructure":
        setShouldShowApplyButton(false);
        break;
    }
  }, [selectedSectionInEditorPage]);

  useEffect(() => {
    switch (selectedSectionInEditorPage) {
      case "experiences":
        setAddNewItemButtonLabel("Add new experience");
        break;
      case "educations":
        setAddNewItemButtonLabel("Add new education");
        break;
      case "skills":
        setAddNewItemButtonLabel("Add new skill category");
        break;
      case "metaData":
      case "mainInfo":
      case "summary":
      case "styleSettings":
      case "pageStructure":
        setAddNewItemButtonLabel("");
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

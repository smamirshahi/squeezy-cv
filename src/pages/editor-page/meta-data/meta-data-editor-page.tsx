import { InformationTooltip } from "@components/information-tooltip";
import { MetaData } from "@custom-types/json-types";
import { Box, TextField, Typography } from "@mui/material";
import {
  appSelector,
  setShouldApplyChanges,
  setShouldDiscardChanges,
} from "@store/app/app-slice";
import { metaDataSelector, setMetaData } from "@store/cv-data/cv-data-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { useEffect, useState } from "react";

export function MetaDataEditorPage(): JSX.Element {
  const dispatch = useAppDispatch();
  const metaData = useAppSelector(metaDataSelector);
  const [newMetaData, setNewMetaData] = useState<MetaData>(metaData);
  const { shouldApplyChanges, shouldDiscardChanges } =
    useAppSelector(appSelector);

  useEffect(() => {
    setNewMetaData(metaData);
  }, [metaData]);

  useEffect(() => {
    if (shouldApplyChanges) {
      dispatch(setMetaData(newMetaData));
      dispatch(setShouldApplyChanges(false));
    }
    if (shouldDiscardChanges) {
      setNewMetaData(metaData);
      dispatch(setShouldDiscardChanges(false));
    }
  }, [
    dispatch,
    metaData,
    newMetaData,
    shouldApplyChanges,
    shouldDiscardChanges,
  ]);

  return (
    <>
      <Typography sx={{ m: "10px" }} variant="h6">
        This section does not affect the CV page. It is intended solely for your
        own reference to track when and where you applied.
      </Typography>
      <Box
        display="flex"
        flexDirection="row"
        sx={{
          mb: "10px",
        }}
      >
        <TextField
          fullWidth
          value={newMetaData.title}
          onChange={(event) =>
            setNewMetaData({ ...newMetaData, title: event.target.value })
          }
          label="job title"
        />
        <InformationTooltip infoText="Enter the job title you're applying for. This can be used as a reference in your documentation." />
      </Box>
      <Box
        display="flex"
        flexDirection="row"
        sx={{
          mb: "10px",
        }}
      >
        <TextField
          fullWidth
          value={newMetaData.jobUrl}
          onChange={(event) =>
            setNewMetaData({ ...newMetaData, jobUrl: event.target.value })
          }
          label="job url"
        />
        <InformationTooltip infoText="Enter the link to the job application. It will serve as a reference in your records." />
      </Box>
      <Box
        display="flex"
        flexDirection="row"
        sx={{
          mb: "10px",
        }}
      >
        <TextField type="date" fullWidth />
        <InformationTooltip infoText="Enter the date in which you applied for the job. It will serve as a reference in your records." />
      </Box>
    </>
  );
}

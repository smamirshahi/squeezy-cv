import { InformationTooltip } from "@components/information-tooltip";
import { useDebounceCallback } from "@hooks/use-debounce-callback";
import { Box, TextField, Typography } from "@mui/material";
import { metaDataSelector, setMetaData } from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@store/store-helper";

export function MetaDataSection(): JSX.Element {
  const metaData = useAppSelector(metaDataSelector);

  const { localState: localJobTitle, setLocalState: setLocalJobTitle } =
    useDebounceCallback({
      reduxState: metaData.title,
      createAction: (value) => setMetaData({ field: "title", value }),
    });

  const { localState: localJobUrl, setLocalState: setLocalJobUrl } =
    useDebounceCallback({
      reduxState: metaData.jobUrl,
      createAction: (value) => setMetaData({ field: "jobUrl", value }),
    });
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
          value={localJobTitle}
          onChange={(event) => setLocalJobTitle(event.target.value)}
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
          value={localJobUrl}
          onChange={(event) => setLocalJobUrl(event.target.value)}
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
        <TextField type="date" label="Application Date" fullWidth />
        <InformationTooltip infoText="Enter the date in which you applied for the job. It will serve as a reference in your records." />
      </Box>
    </>
  );
}

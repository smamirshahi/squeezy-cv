import { InformationTooltip } from "@components/information-tooltip";
import { Box, TextField, Typography } from "@mui/material";
import { SetStateFunction } from "@store/store-helper";

interface Props {
  jobTitle: string;
  setJobTitle: SetStateFunction<string>;
  jobUrl: string;
  setJobUrl: SetStateFunction<string>;
}

export function MetaDataSection({
  jobTitle,
  setJobTitle,
  jobUrl,
  setJobUrl,
}: Props): JSX.Element {
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
          value={jobTitle}
          onChange={(event) => setJobTitle(event.target.value)}
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
          value={jobUrl}
          onChange={(event) => setJobUrl(event.target.value)}
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

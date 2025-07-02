import { useDebounceCallback } from "@hooks/use-debounce-callback";
import { TextField } from "@mui/material";
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
      <TextField
        fullWidth
        value={localJobTitle}
        onChange={(event) => setLocalJobTitle(event.target.value)}
        sx={{
          mb: "10px",
        }}
        label="job title"
      />
      <TextField
        fullWidth
        value={localJobUrl}
        onChange={(event) => setLocalJobUrl(event.target.value)}
        sx={{
          mb: "10px",
        }}
        label="job url"
        inputProps={{ style: { height: "40px" } }}
      />
    </>
  );
}

import { Autocomplete, TextField, Tooltip } from "@components/ui";
import { InfoOutlined as InfoOutlinedIcon } from "@components/ui/icons";

interface JobTitleOptionsProps {
  options: string[];
  onChange: (options: string[]) => void;
}

const GUIDANCE =
  "The best job title depends on the advert. Keep the other titles you could honestly use (for example Software Developer, Frontend Engineer, Full-Stack Developer) here. Each job then shows the one that fits it, chosen on the Jobs page (or suggested by AI from the advert). Only add titles that describe the work you really do.";

/** The other job titles a job can pick from: type one and press Enter to add it as a chip */
export function JobTitleOptions({
  options,
  onChange,
}: JobTitleOptionsProps): JSX.Element {
  return (
    <Autocomplete
      multiple
      freeSolo
      size="small"
      options={[]}
      sx={{ "& .MuiOutlinedInput-root": { pr: 9 } }}
      value={options}
      onChange={(_event, value) =>
        onChange(value.map((entry) => entry.trim()).filter(Boolean))
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label="Other job titles"
          placeholder="Type a title, press Enter"
          helperText="Alternative headlines a job can use instead of the main one."
          slotProps={{
            ...params.slotProps,
            inputLabel: { ...params.slotProps?.inputLabel, shrink: true },
            htmlInput: {
              ...params.slotProps?.htmlInput,
              "aria-label": "Other job titles",
            },
            input: {
              ...params.slotProps?.input,
              endAdornment: (
                <>
                  <Tooltip title={GUIDANCE}>
                    <InfoOutlinedIcon
                      fontSize="small"
                      aria-label="Why keep other job titles"
                      sx={{
                        position: "absolute",
                        right: 40,
                        top: "calc(50% - 10px)",
                        color: "text.secondary",
                      }}
                    />
                  </Tooltip>
                  {params.slotProps?.input?.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
    />
  );
}

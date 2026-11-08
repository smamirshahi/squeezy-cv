import {
  Box,
  Button,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";

interface JobTitleOptionsProps {
  options: string[];
  onChange: (options: string[]) => void;
}

const GUIDANCE =
  "The best job title depends on the advert. Keep the other titles you could honestly use (for example Software Developer, Frontend Engineer, Full-Stack Developer) here. Each job then shows the one that fits it, chosen on the Jobs page (or suggested by AI from the advert). Only add titles that describe the work you really do.";

/** The other job titles a job can pick from, with a short note on why to keep several */
export function JobTitleOptions({
  options,
  onChange,
}: JobTitleOptionsProps): JSX.Element {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Other job titles
        </Typography>
        <Tooltip title={GUIDANCE}>
          <IconButton size="small" aria-label="Why keep other job titles">
            <InfoOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      {options.map((option, index) => (
        <Box key={index} sx={{ display: "flex", gap: 1 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Frontend Engineer"
            value={option}
            slotProps={{
              htmlInput: { "aria-label": `Other job title ${index + 1}` },
            }}
            onChange={(event) =>
              onChange(
                options.map((o, i) => (i === index ? event.target.value : o))
              )
            }
          />
          <IconButton
            aria-label={`Remove job title ${index + 1}`}
            onClick={() => onChange(options.filter((_, i) => i !== index))}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ))}
      <Box>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => onChange([...options, ""])}
        >
          Add another job title
        </Button>
      </Box>
    </Box>
  );
}

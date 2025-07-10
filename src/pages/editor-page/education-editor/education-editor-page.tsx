import {
  Box,
  Button,
  FormControlLabel,
  IconButton,
  Switch,
  TextField,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { SetStateFunction } from "@store/store-helper";
import { Education } from "@custom-types/education-types";
import { nanoid } from "@reduxjs/toolkit";

interface Props {
  newEducations: Education[];
  setNewEducations: SetStateFunction<Education[]>;
}

/** Shows the education in editor page */
export function EducationEditorPage({
  newEducations,
  setNewEducations,
}: Props): JSX.Element {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {newEducations.map((education) => (
        <Box
          key={education.id}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Degree"
              value={education.degree}
              onChange={(event) =>
                setNewEducations((prev) =>
                  prev.map((edu) =>
                    edu.id === education.id
                      ? { ...edu, degree: event.target.value }
                      : edu
                  )
                )
              }
              fullWidth
              // eslint-disable-next-line @typescript-eslint/naming-convention -- external package naming
              InputLabelProps={{ shrink: true }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={education.shouldShow}
                  onChange={(event) =>
                    setNewEducations((prev) =>
                      prev.map((edu) =>
                        edu.id === education.id
                          ? { ...edu, shouldShow: event.target.checked }
                          : edu
                      )
                    )
                  }
                />
              }
              label="Show this education"
            />

            <IconButton
              onClick={() =>
                setNewEducations((prev) =>
                  prev.filter((edu) => edu.id !== education.id)
                )
              }
            >
              <DeleteIcon />
            </IconButton>
          </Box>

          {/* Company and Location in one line */}
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Institute"
              value={education.institute}
              onChange={(event) =>
                setNewEducations((prev) =>
                  prev.map((edu) =>
                    edu.id === education.id
                      ? { ...edu, institute: event.target.value }
                      : edu
                  )
                )
              }
              fullWidth
              // eslint-disable-next-line @typescript-eslint/naming-convention -- external package naming
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Location"
              value={education.location}
              onChange={(event) =>
                setNewEducations((prev) =>
                  prev.map((edu) =>
                    edu.id === education.id
                      ? { ...edu, location: event.target.value }
                      : edu
                  )
                )
              }
              fullWidth
              // eslint-disable-next-line @typescript-eslint/naming-convention -- external package naming
              InputLabelProps={{ shrink: true }}
            />
          </Box>

          {/* Start and End Date in one line */}
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Start Date"
              value={education.startDate}
              onChange={(event) =>
                setNewEducations((prev) =>
                  prev.map((edu) =>
                    edu.id === education.id
                      ? { ...edu, startDate: event.target.value }
                      : edu
                  )
                )
              }
              fullWidth
              // eslint-disable-next-line @typescript-eslint/naming-convention -- external package naming
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End Date"
              value={education.endDate}
              onChange={(event) =>
                setNewEducations((prev) =>
                  prev.map((edu) =>
                    edu.id === education.id
                      ? { ...edu, endDate: event.target.value }
                      : edu
                  )
                )
              }
              fullWidth
              // eslint-disable-next-line @typescript-eslint/naming-convention -- external package naming
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          <TextField
            label="Dissertation Title"
            value={education.dissertationTitle}
            onChange={(event) =>
              setNewEducations((prev) =>
                prev.map((edu) =>
                  edu.id === education.id
                    ? { ...edu, dissertationTitle: event.target.value }
                    : edu
                )
              )
            }
            fullWidth
            // eslint-disable-next-line @typescript-eslint/naming-convention -- external package naming
            InputLabelProps={{ shrink: true }}
          />
        </Box>
      ))}

      <Button
        variant="contained"
        onClick={() =>
          setNewEducations((prev) => [
            ...prev,
            {
              id: nanoid(),
              degree: "",
              institute: "",
              location: "",
              startDate: "",
              endDate: "",
              dissertationTitle: "",
              shouldShow: true,
            },
          ])
        }
      >
        Add Education
      </Button>
    </Box>
  );
}

import {
  Box,
  Button,
  FormControlLabel,
  IconButton,
  Switch,
  TextField,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { SetStateFunction, useAppDispatch } from "@store/store-helper";
import {
  addEducation,
  removeEducation,
  updateEducation,
} from "@store/cv-data/cv-data-slice";
import { Education } from "@custom-types/education-types";

interface Props {
  newEducations: Education[];
  setNewEducations: SetStateFunction<Education[]>;
}

/** Shows the education in editor page */
export function EducationEditorPage({
  newEducations,
  setNewEducations,
}: Props): JSX.Element {
  const dispatch = useAppDispatch();

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
                    dispatch(
                      updateEducation({
                        educationId: education.id,
                        key: "shouldShow",
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        value: event.target.checked,
                      })
                    )
                  }
                />
              }
              label="Show this education"
            />

            <IconButton onClick={() => dispatch(removeEducation(education.id))}>
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

      <Button variant="contained" onClick={() => dispatch(addEducation())}>
        Add Education
      </Button>
    </Box>
  );
}

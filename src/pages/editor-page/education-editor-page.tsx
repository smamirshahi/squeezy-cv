import { Box, Button, IconButton, TextField } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { CVAccordion } from "@components/cv-accordion";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  addEducation,
  cvDataSelector,
  removeEducation,
  updateEducation,
} from "@store/cv-data/cv-data-slice";

export function EducationEditorPage(): JSX.Element {
  const { educations } = useAppSelector(cvDataSelector);
  const dispatch = useAppDispatch();

  return (
    <CVAccordion title="Education">
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {educations.map((education) => (
          <Box
            key={education.id}
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Degree"
                value={education.degree}
                onChange={(event) =>
                  dispatch(
                    updateEducation({
                      id: education.id,
                      key: "degree",
                      value: event.target.value,
                    })
                  )
                }
                fullWidth
              />
              <IconButton
                onClick={() => dispatch(removeEducation(education.id))}
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
                  dispatch(
                    updateEducation({
                      id: education.id,
                      key: "institute",
                      value: event.target.value,
                    })
                  )
                }
                fullWidth
              />
              <TextField
                label="Location"
                value={education.location}
                onChange={(event) =>
                  dispatch(
                    updateEducation({
                      id: education.id,
                      key: "location",
                      value: event.target.value,
                    })
                  )
                }
                fullWidth
              />
            </Box>
            {/* Start and End Date in one line */}
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Start Date"
                type="date"
                value={education.startDate}
                onChange={(event) =>
                  dispatch(
                    updateEducation({
                      id: education.id,
                      key: "startDate",
                      value: event.target.value,
                    })
                  )
                }
                // eslint-disable-next-line @typescript-eslint/naming-convention -- external package naming
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="End Date"
                type="date"
                value={education.endDate}
                onChange={(event) =>
                  dispatch(
                    updateEducation({
                      id: education.id,
                      key: "endDate",
                      value: event.target.value,
                    })
                  )
                }
                // eslint-disable-next-line @typescript-eslint/naming-convention -- external package naming
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Box>
            <TextField
              label="Dissertation Title"
              value={education.dissertationTitle}
              onChange={(event) =>
                dispatch(
                  updateEducation({
                    id: education.id,
                    key: "dissertationTitle",
                    value: event.target.value,
                  })
                )
              }
              fullWidth
            />
          </Box>
        ))}

        <Button variant="contained" onClick={() => dispatch(addEducation())}>
          Add Education
        </Button>
      </Box>
    </CVAccordion>
  );
}

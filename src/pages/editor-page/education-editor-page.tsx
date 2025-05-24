import {
  Box,
  Button,
  IconButton,
  TextField,
  AccordionSummary,
  AccordionDetails,
  Accordion,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { SetStateFunction, useAppDispatch } from "@src/store/store-helper";
import {
  addEducation,
  removeEducation,
  updateEducation,
} from "@src/store/cv-data/cv-data-slice";
import { Education } from "@src/custom-types/json-types";

interface Props {
  /** The educations to edit */
  educations: Education[];

  /** Setter for the educations to edit */
  setEducations: SetStateFunction<Education[]>;
}

export function EducationEditorPage({ educations, setEducations }: Props) {
  const dispatch = useAppDispatch();

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        Education
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {educations.map((edu) => (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  label="Degree"
                  value={edu.degree}
                  onChange={(event) =>
                    dispatch(
                      updateEducation({
                        id: edu.id,
                        key: "degree",
                        value: event.target.value,
                      })
                    )
                  }
                  fullWidth
                />
                <IconButton onClick={() => dispatch(removeEducation(edu.id))}>
                  <DeleteIcon />
                </IconButton>
              </Box>
              {/* Company and Location in one line */}
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  label="Institute"
                  value={edu.institute}
                  onChange={(event) =>
                    dispatch(
                      updateEducation({
                        id: edu.id,
                        key: "institute",
                        value: event.target.value,
                      })
                    )
                  }
                  fullWidth
                />
                <TextField
                  label="Location"
                  value={edu.location}
                  onChange={(event) =>
                    dispatch(
                      updateEducation({
                        id: edu.id,
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
                  value={edu.startDate}
                  onChange={(event) =>
                    dispatch(
                      updateEducation({
                        id: edu.id,
                        key: "startDate",
                        value: event.target.value,
                      })
                    )
                  }
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="End Date"
                  type="date"
                  value={edu.endDate}
                  onChange={(event) =>
                    dispatch(
                      updateEducation({
                        id: edu.id,
                        key: "endDate",
                        value: event.target.value,
                      })
                    )
                  }
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Box>
              <TextField
                label="Dissertation Title"
                value={edu.dissertationTitle}
                onChange={(event) =>
                  dispatch(
                    updateEducation({
                      id: edu.id,
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
      </AccordionDetails>
    </Accordion>
  );
}

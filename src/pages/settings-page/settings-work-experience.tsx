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
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useAppDispatch, useAppSelector } from "@src/store/store-helper";
import {
  cvDataSelector,
  updateExperienceBulletPoint,
  updateExperience,
  removeExperience,
  addExperience,
  addBulletPoint,
  removeBulletPoint,
} from "@src/store/applicant/applicant-slice";

export function SettingsWorkExperience() {
  const dispatch = useAppDispatch();
  const { experiences } = useAppSelector(cvDataSelector);

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        Work Experience
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {experiences.map((exp) => (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  label="Job Title"
                  value={exp.jobTitle}
                  onChange={(event) =>
                    dispatch(
                      updateExperience({
                        id: exp.id,
                        key: "jobTitle",
                        value: event.target.value,
                      })
                    )
                  }
                  fullWidth
                />
                <IconButton onClick={() => dispatch(removeExperience(exp.id))}>
                  <DeleteIcon />
                </IconButton>
              </Box>
              {/* Company and Location in one line */}
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  label="Company"
                  value={exp.company}
                  onChange={(event) =>
                    dispatch(
                      updateExperience({
                        id: exp.id,
                        key: "company",
                        value: event.target.value,
                      })
                    )
                  }
                  fullWidth
                />
                <TextField
                  label="Location"
                  value={exp.location}
                  onChange={(event) =>
                    dispatch(
                      updateExperience({
                        id: exp.id,
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
                  value={exp.startDate}
                  onChange={(event) =>
                    dispatch(
                      updateExperience({
                        id: exp.id,
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
                  value={exp.endDate}
                  onChange={(event) =>
                    dispatch(
                      updateExperience({
                        id: exp.id,
                        key: "endDate",
                        value: event.target.value,
                      })
                    )
                  }
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Box>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  mb: 2,
                }}
              >
                {exp.bulletPoints.map((point, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <TextField
                      label={`Bullet Point ${index + 1}`}
                      value={point}
                      onChange={(event) =>
                        dispatch(
                          updateExperienceBulletPoint({
                            id: exp.id,
                            index,
                            value: event.target.value,
                          })
                        )
                      }
                      fullWidth
                    />
                    <IconButton
                      onClick={() => {
                        dispatch(removeBulletPoint({ id: exp.id, index }));
                      }}
                      disabled={exp.bulletPoints.length === 1}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
                <Box>
                  <IconButton
                    onClick={() => {
                      dispatch(addBulletPoint({ id: exp.id }));
                    }}
                  >
                    <AddIcon />
                  </IconButton>
                </Box>
              </Box>
            </Box>
          ))}

          <Button variant="contained" onClick={() => dispatch(addExperience())}>
            Add Work Experience
          </Button>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
